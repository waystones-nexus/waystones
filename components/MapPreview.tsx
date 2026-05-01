import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DataModel } from '../types';
import { generateFullStyle } from '../utils/styleTranslator';
import { Globe, RefreshCcw, Layers, Map as MapIcon } from 'lucide-react';

interface MapPreviewProps {
  model: DataModel;
}

const MapPreview: React.FC<MapPreviewProps> = ({ model }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [tileUrl, setTileUrl] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Register PMTiles protocol
    const protocol = new Protocol();
    maplibregl.addProtocol('pmtiles', protocol.tile);

    return () => {
      maplibregl.removeProtocol('pmtiles');
    };
  }, []);

  const initMap = () => {
    if (!mapContainerRef.current || !tileUrl) return;

    if (mapRef.current) {
      mapRef.current.remove();
    }

    const style = generateFullStyle(model.layers, tileUrl);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: style,
      center: [0, 0],
      zoom: 1
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setIsLoaded(true);
      // Fit to bounds logic could go here if we had sample metadata
    });

    mapRef.current = map;
  };

  useEffect(() => {
    if (tileUrl) {
      initMap();
    }
  }, [tileUrl]);

  // Update styles if model changes without re-initializing map
  useEffect(() => {
    if (mapRef.current && isLoaded && tileUrl) {
      const newStyle = generateFullStyle(model.layers, tileUrl);
      mapRef.current.setStyle(newStyle);
    }
  }, [model, isLoaded]);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-800">
      
      {/* Header / Controls */}
      <div className="bg-slate-900/80 backdrop-blur-md p-4 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
            <Globe className="text-indigo-400" size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">{model.name || 'Map Preview'}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Vector Tile Inspector</p>
          </div>
        </div>

        <div className="flex-1 max-w-md relative group">
          <input 
            type="text" 
            placeholder="Enter PMTiles URL (e.g. https://.../data.pmtiles)"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            value={tileUrl}
            onChange={(e) => setTileUrl(e.target.value)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            <RefreshCcw size={14} className="animate-spin-slow group-hover:text-indigo-400 transition-colors cursor-pointer" onClick={initMap} />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
          <Layers size={14} className="text-indigo-400" />
          <span className="text-[10px] font-black text-slate-300 uppercase">{model.layers.length} Active Layers</span>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        {!tileUrl && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm text-center p-8">
             <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mb-4 border border-slate-700 shadow-xl">
               <MapIcon size={32} className="text-slate-600" />
             </div>
             <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">No Tile Source</h4>
             <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
               Provide a PMTiles URL to preview your data model in the high-performance vector engine.
             </p>
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* Layer Legend Overlay */}
        {tileUrl && isLoaded && (
          <div className="absolute bottom-6 left-6 z-20 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-4 max-h-[300px] overflow-y-auto custom-scrollbar shadow-2xl">
            <h5 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 flex items-center gap-2"><Layers size={12}/> Legend</h5>
            <div className="space-y-2.5">
              {model.layers.map(layer => (
                <div key={layer.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: layer.style.simpleColor }} />
                  <span className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]">{layer.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPreview;
