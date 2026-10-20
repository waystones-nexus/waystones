"""
test_tile_generator.py — Tests for vector-tile-generator.py layer selection,
PostGIS connection building and tippecanoe command construction, plus the
related main.py / server_wrapper.py plumbing.
"""
import json
import types

import pytest

from conftest import load_worker

tile_gen = load_worker("vector-tile-generator.py")
main_mod = load_worker("main.py")
wrapper = pytest.importorskip("server_wrapper")


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    for var in ("TILE_LAYERS_JSON", "TABLES", "EXCLUDE_LAYERS", "EXCLUDE_ATTRIBUTES", "PGPASSWORD"):
        monkeypatch.delenv(var, raising=False)


# ---------------------------------------------------------------------------
# list_layers
# ---------------------------------------------------------------------------

class TestListLayers:
    def _run(self, mocker, stdout, returncode=0):
        mocker.patch.object(tile_gen.subprocess, "run", return_value=types.SimpleNamespace(
            returncode=returncode, stdout=stdout, stderr="boom" if returncode else ""))
        return tile_gen.list_layers("src.gpkg")

    def test_parses_numbered_layer_lines(self, mocker):
        out = ("INFO: Open of `src.gpkg'\n      using driver `GPKG' successful.\n"
               "1: roads (Line String)\n2: buildings (Multi Polygon)\n3: attrs (None)\n")
        assert self._run(mocker, out) == ["roads", "buildings", "attrs"]

    def test_keeps_multi_geometry_column_suffix(self, mocker):
        assert self._run(mocker, "1: parcels(geom) (Polygon)\n") == ["parcels(geom)"]

    def test_layer_without_geometry_type(self, mocker):
        assert self._run(mocker, "1: lookup\n") == ["lookup"]

    def test_failure_returns_empty(self, mocker):
        assert self._run(mocker, "", returncode=1) == []


# ---------------------------------------------------------------------------
# resolve_layers
# ---------------------------------------------------------------------------

class TestResolveLayersExplicit:
    def test_only_requested_layers_are_tiled(self, monkeypatch):
        monkeypatch.setenv("TILE_LAYERS_JSON", json.dumps([{"source": "roads", "name": "roads"}]))
        to_process, skipped = tile_gen.resolve_layers(["roads", "secret_table", "users"])
        assert to_process == [("roads", "roads")]
        assert skipped == []

    def test_mvt_name_comes_from_model_not_source(self, monkeypatch):
        monkeypatch.setenv("TILE_LAYERS_JSON", json.dumps([{"source": "bygg_2024", "name": "buildings"}]))
        to_process, _ = tile_gen.resolve_layers(["bygg_2024"])
        assert to_process == [("bygg_2024", "buildings")]

    def test_public_schema_prefix_matches_bare_table(self, monkeypatch):
        monkeypatch.setenv("TILE_LAYERS_JSON", json.dumps([{"source": "public.roads", "name": "roads"}]))
        to_process, _ = tile_gen.resolve_layers(["roads"])
        assert to_process == [("roads", "roads")]

    def test_case_insensitive_fallback(self, monkeypatch):
        monkeypatch.setenv("TILE_LAYERS_JSON", json.dumps([{"source": "Roads", "name": "roads"}]))
        to_process, _ = tile_gen.resolve_layers(["roads"])
        assert to_process == [("roads", "roads")]

    def test_missing_source_is_reported(self, monkeypatch):
        monkeypatch.setenv("TILE_LAYERS_JSON", json.dumps([
            {"source": "roads", "name": "roads"},
            {"source": "gone", "name": "gone"},
        ]))
        to_process, skipped = tile_gen.resolve_layers(["roads"])
        assert to_process == [("roads", "roads")]
        assert skipped == [{"name": "gone", "reason": "not found in source"}]

    def test_colliding_names_get_suffix(self, monkeypatch):
        monkeypatch.setenv("TILE_LAYERS_JSON", json.dumps([
            {"source": "a", "name": "Roads"},
            {"source": "b", "name": "roads!"},
        ]))
        to_process, _ = tile_gen.resolve_layers(["a", "b"])
        assert to_process == [("a", "roads"), ("b", "roads_2")]


class TestResolveLayersLegacy:
    def test_all_layers_when_no_spec(self):
        to_process, _ = tile_gen.resolve_layers(["Roads", "Buildings"])
        assert to_process == [("Roads", "roads"), ("Buildings", "buildings")]

    def test_tables_env_filters(self, monkeypatch):
        monkeypatch.setenv("TABLES", "roads")
        to_process, _ = tile_gen.resolve_layers(["roads", "buildings"])
        assert to_process == [("roads", "roads")]

    def test_exclude_layers_env(self, monkeypatch):
        monkeypatch.setenv("EXCLUDE_LAYERS", "buildings")
        to_process, _ = tile_gen.resolve_layers(["roads", "buildings"])
        assert to_process == [("roads", "roads")]


# ---------------------------------------------------------------------------
# build_pg_connection_string
# ---------------------------------------------------------------------------

class TestBuildPgConnectionString:
    @pytest.fixture(autouse=True)
    def pg_env(self, monkeypatch):
        monkeypatch.setenv("PG_HOST", "db.example.com")
        monkeypatch.setenv("PG_PORT", "5432")
        monkeypatch.setenv("PG_DB", "my db")
        monkeypatch.setenv("PG_USER", "alice")
        monkeypatch.setenv("PG_PASSWORD", "p@ss w'rd")

    def test_password_not_in_conn_string(self):
        conn = tile_gen.build_pg_connection_string()
        assert "p@ss" not in conn
        assert tile_gen.os.environ["PGPASSWORD"] == "p@ss w'rd"

    def test_values_are_quoted(self):
        conn = tile_gen.build_pg_connection_string()
        assert conn == "PG:host='db.example.com' port='5432' dbname='my db' user='alice'"

    def test_quote_escapes_quotes_and_backslashes(self):
        assert tile_gen._conninfo_quote("a'b\\c") == "'a\\'b\\\\c'"

    def test_none_without_host(self, monkeypatch):
        monkeypatch.delenv("PG_HOST")
        assert tile_gen.build_pg_connection_string() is None


# ---------------------------------------------------------------------------
# tippecanoe_command
# ---------------------------------------------------------------------------

def _args(**kw):
    base = dict(min_zoom=0, max_zoom=14, auto_zoom=False, simplification=None)
    base.update(kw)
    return types.SimpleNamespace(**base)


class TestTippecanoeCommand:
    EXTRACTED = [("Roads", "roads", "/w/roads.geojsonseq"), ("Bygg", "bygg", "/w/bygg.geojsonseq")]

    def test_layers_use_mvt_names(self):
        cmd = tile_gen.tippecanoe_command(_args(), "/w/out.pmtiles", self.EXTRACTED, "proj")
        assert "roads:/w/roads.geojsonseq" in cmd
        assert "bygg:/w/bygg.geojsonseq" in cmd

    def test_fixed_zoom(self):
        cmd = tile_gen.tippecanoe_command(_args(min_zoom=2, max_zoom=12), "/o", self.EXTRACTED, "p")
        assert cmd[cmd.index("-Z") + 1] == "2"
        assert cmd[cmd.index("-z") + 1] == "12"
        assert "-zg" not in cmd

    def test_auto_zoom(self):
        cmd = tile_gen.tippecanoe_command(_args(auto_zoom=True), "/o", self.EXTRACTED, "p")
        assert "-zg" in cmd and "-z" not in cmd

    def test_auto_zoom_has_floor_and_base_zoom_guess(self):
        cmd = tile_gen.tippecanoe_command(_args(auto_zoom=True), "/o", self.EXTRACTED, "p")
        assert "--smallest-maximum-zoom-guess=12" in cmd
        assert "-Bg" in cmd

    def test_fixed_zoom_has_no_guess_flags(self):
        cmd = tile_gen.tippecanoe_command(_args(), "/o", self.EXTRACTED, "p")
        assert not any(c.startswith("--smallest-maximum-zoom-guess") for c in cmd)
        assert "-Bg" not in cmd

    def test_tuning_flags(self):
        cmd = tile_gen.tippecanoe_command(_args(), "/o", self.EXTRACTED, "proj")
        for flag in ("--drop-densest-as-needed", "--generate-ids", "--read-parallel"):
            assert flag in cmd
        assert cmd[cmd.index("-n") + 1] == "proj"

    def test_non_ascii_attribute_exclusion_passed_verbatim(self, monkeypatch):
        monkeypatch.setenv("EXCLUDE_ATTRIBUTES", "høyde,bygg-nr")
        cmd = tile_gen.tippecanoe_command(_args(), "/o", self.EXTRACTED, "p")
        assert cmd[cmd.index("høyde") - 1] == "--exclude"
        assert "bygg-nr" in cmd

    def test_exclude_all(self, monkeypatch):
        monkeypatch.setenv("EXCLUDE_ATTRIBUTES", "*")
        cmd = tile_gen.tippecanoe_command(_args(), "/o", self.EXTRACTED, "p")
        assert "--exclude-all" in cmd and "--exclude" not in cmd


# ---------------------------------------------------------------------------
# delete_stale_archives
# ---------------------------------------------------------------------------

class TestDeleteStaleArchives:
    def test_deletes_only_other_pmtiles(self, mocker):
        client = mocker.Mock()
        client.list_objects_v2.return_value = {"Contents": [
            {"Key": "users/u/projects/p/tiles/new-name.pmtiles"},
            {"Key": "users/u/projects/p/tiles/old-name.pmtiles"},
            {"Key": "users/u/projects/p/tiles/.tiles.json"},
        ]}
        mocker.patch.object(tile_gen, "_boto3_client", return_value=client)

        tile_gen.delete_stale_archives("s3://bucket/users/u/projects/p/tiles", "new-name.pmtiles")

        client.list_objects_v2.assert_called_once_with(Bucket="bucket", Prefix="users/u/projects/p/tiles/")
        client.delete_object.assert_called_once_with(Bucket="bucket", Key="users/u/projects/p/tiles/old-name.pmtiles")


# ---------------------------------------------------------------------------
# main.py / server_wrapper.py plumbing
# ---------------------------------------------------------------------------

class TestParsePgUriPercentDecoding:
    def test_encoded_password_is_decoded(self):
        result = main_mod.parse_pg_uri("postgresql://al%40ice:p%40ss%3Aw%2Frd%23@host:5432/my%20db")
        assert result["PG_USER"] == "al@ice"
        assert result["PG_PASSWORD"] == "p@ss:w/rd#"
        assert result["PG_DB"] == "my db"


class TestRedactPayload:
    def test_secrets_redacted(self):
        payload = {"projectId": "p", "inputUri": "postgresql://u:pw@h/db", "s3Env": {"AWS_SECRET_ACCESS_KEY": "x"}}
        out = wrapper.redact_payload(payload)
        assert out["projectId"] == "p"
        assert out["inputUri"] == "[redacted]"
        assert out["s3Env"] == "[redacted]"
        assert "pw" not in json.dumps(out)


class TestMainRedact:
    def test_dsn_credentials_masked(self):
        assert main_mod.redact("postgresql://alice:pw@db:5432/x") == "postgresql://***@db:5432/x"

    def test_dsn_inside_argument(self):
        assert main_mod.redact("--source=postgres://u:p%40ss@h/db") == "--source=postgres://***@h/db"

    def test_model_argument_hidden(self):
        assert main_mod.redact("--model=eyJsYXllcnMiOltdfQ==") == "--model=<redacted>"

    def test_plain_values_untouched(self):
        assert main_mod.redact("s3://bucket/key.gpkg") == "s3://bucket/key.gpkg"


class TestForceIpv4ForEndpoint:
    def _patch(self, mocker, error):
        mocker.patch.object(tile_gen.socket, "gethostbyname", return_value="1.2.3.4")
        mocker.patch("builtins.open", side_effect=error)

    def test_read_only_hosts_is_silent(self, mocker, capsys):
        self._patch(mocker, OSError(tile_gen.errno.EROFS, "Read-only file system"))
        tile_gen.force_ipv4_for_endpoint("https://acct.r2.cloudflarestorage.com")
        assert capsys.readouterr().out == ""

    def test_other_errors_still_warn(self, mocker, capsys):
        self._patch(mocker, OSError(tile_gen.errno.EACCES, "Permission denied"))
        tile_gen.force_ipv4_for_endpoint("https://acct.r2.cloudflarestorage.com")
        assert "DNS override failed" in capsys.readouterr().out
