FROM qgis/qgis-server:ltr

COPY qgis-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

RUN mkdir -p /data

ENTRYPOINT ["/entrypoint.sh"]
