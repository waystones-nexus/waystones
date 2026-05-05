FROM qgis/qgis-server:ltr

COPY qgis-entrypoint.sh /entrypoint.sh
COPY waystones_qgis_proxy.py /waystones_qgis_proxy.py
RUN chmod +x /entrypoint.sh

RUN mkdir -p /data

ENTRYPOINT ["/entrypoint.sh"]
