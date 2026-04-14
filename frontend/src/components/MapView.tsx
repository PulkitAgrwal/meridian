"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Polyline, Circle, OverlayView } from "@react-google-maps/api";
import type { CascadeImpact, RouteAlternative } from "@/lib/types";
import { CORRIDORS, CORRIDOR_COLORS, DEMO_VESSELS, PORTS } from "@/lib/demo-data";

const MAP_CENTER = { lat: 15.0, lng: 70.0 };
const MAP_ZOOM = 3;

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1a2b" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#2a2a4a" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#5a5a7a" }] },
];

const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f0f0f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a4a4a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c8d7e8" }] },
  { featureType: "road", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#cccccc" }] },
];

function getMapOptions(isDark: boolean): google.maps.MapOptions {
  return {
    styles: isDark ? DARK_MAP_STYLES : LIGHT_MAP_STYLES,
    disableDefaultUI: true,
    zoomControl: true,
    zoomControlOptions: { position: 9 },
    backgroundColor: isDark ? "#1a1a2e" : "#f0f0f5",
    minZoom: 2,
    maxZoom: 12,
  };
}

interface Props {
  disruptionActive: boolean;
  cascadeImpacts: CascadeImpact[];
  alternatives: RouteAlternative[];
  selectedRouteId: string | null;
  isDark?: boolean;
}

export default function MapView({ disruptionActive, cascadeImpacts, alternatives, selectedRouteId, isDark = true }: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [pulseRadius, setPulseRadius] = useState(50000);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Update map styles when theme changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setOptions(getMapOptions(isDark));
    }
  }, [isDark]);

  // Disruption pulse animation
  useEffect(() => {
    if (!disruptionActive) return;
    let frame: number;
    let start: number | null = null;

    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const cycle = (elapsed % 2000) / 2000;
      const r = 30000 + cycle * 150000;
      setPulseRadius(r);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [disruptionActive]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full" style={{ background: "var(--bg-base)" }} data-testid="map-loading">
        <div className="flex flex-col items-center gap-4">
          {/* Skeleton map */}
          <div className="skeleton" style={{ width: "200px", height: "12px" }} />
          <div className="skeleton" style={{ width: "160px", height: "12px" }} />
          <div className="skeleton" style={{ width: "120px", height: "12px" }} />
          <span className="font-mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>Loading map...</span>
        </div>
      </div>
    );
  }

  const disruptionCenter = { lat: 2.1, lng: 104.5 };
  const cascadePortIds = new Set(cascadeImpacts.map((c) => c.port_id));
  const selectedRoute = alternatives.find((a) => a.id === selectedRouteId);

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full no-transition"
      center={MAP_CENTER}
      zoom={MAP_ZOOM}
      options={getMapOptions(isDark)}
      onLoad={onLoad}
    >
      {/* Corridor polylines — glow layer */}
      {CORRIDORS.map((corridor) => (
        <Polyline
          key={`${corridor.id}-glow`}
          path={corridor.waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng }))}
          options={{
            strokeColor: CORRIDOR_COLORS[corridor.id],
            strokeOpacity: isDark ? 0.15 : 0.2,
            strokeWeight: isDark ? 5 : 7,
            geodesic: true,
          }}
        />
      ))}

      {/* Corridor polylines — solid */}
      {CORRIDORS.map((corridor) => (
        <Polyline
          key={corridor.id}
          path={corridor.waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng }))}
          options={{
            strokeColor: CORRIDOR_COLORS[corridor.id],
            strokeOpacity: isDark ? 0.6 : 0.9,
            strokeWeight: isDark ? 2 : 3,
            geodesic: true,
          }}
        />
      ))}

      {/* Route alternative polylines (dashed) */}
      {alternatives
        .filter((a) => a.waypoints.length > 0 && a.id !== selectedRouteId)
        .map((alt) => (
          <Polyline
            key={alt.id}
            path={[
              { lat: 1.26, lng: 103.82 },
              ...alt.waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
              { lat: 6.93, lng: 79.84 },
            ]}
            options={{
              strokeColor: "#EF9F27",
              strokeOpacity: 0.4,
              strokeWeight: 2,
              geodesic: true,
              icons: [{
                icon: { path: "M 0,-1 0,1", strokeOpacity: 0.6, scale: 3 },
                offset: "0",
                repeat: "15px",
              }],
            }}
          />
        ))}

      {/* Selected route — solid green with animated arrows */}
      {selectedRoute && selectedRoute.waypoints.length > 0 && (
        <Polyline
          key={`selected-${selectedRoute.id}`}
          path={[
            { lat: 1.26, lng: 103.82 },
            ...selectedRoute.waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
            { lat: 6.93, lng: 79.84 },
          ]}
          options={{
            strokeColor: "#1D9E75",
            strokeOpacity: 0.9,
            strokeWeight: 3,
            geodesic: true,
            icons: [{
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: "#1D9E75",
                fillColor: "#1D9E75",
                fillOpacity: 1,
              },
              offset: "50%",
            }],
          }}
        />
      )}

      {/* Vessel dots */}
      {DEMO_VESSELS.map((v) => (
        <Circle
          key={v.id}
          center={{ lat: v.lat, lng: v.lng }}
          radius={8000}
          options={{
            fillColor: v.portId === "SGSIN" && disruptionActive ? "#E24B4A" : "#3B8BD4",
            fillOpacity: isDark ? 0.6 : 0.75,
            strokeWeight: isDark ? 0 : 1,
            strokeColor: isDark ? undefined : "#FFFFFF",
          }}
        />
      ))}

      {/* Port labels */}
      {Object.values(PORTS).map((port) => {
        const isCascadeTarget = cascadePortIds.has(port.id);
        const cascadeData = cascadeImpacts.find((c) => c.port_id === port.id);
        return (
          <OverlayView
            key={port.id}
            position={{ lat: port.lat, lng: port.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none">
              {isCascadeTarget && cascadeData && (
                <div
                  className="mb-1 px-1.5 py-0.5 rounded font-mono whitespace-nowrap"
                  style={{
                    fontSize: "9px",
                    background: "rgba(226,75,74,0.15)",
                    border: "1px solid rgba(226,75,74,0.3)",
                    color: "#E24B4A",
                  }}
                >
                  +{cascadeData.delay_days}d / {cascadeData.vessels}v
                </div>
              )}
              <div
                className="w-2.5 h-2.5 rounded-full border"
                style={{
                  backgroundColor: isCascadeTarget ? "#E24B4A" : isDark ? "#6b7280" : "#9ca3af",
                  borderColor: isCascadeTarget ? "#E24B4A" : isDark ? "#4b5563" : "#d1d5db",
                  boxShadow: isCascadeTarget ? "0 0 8px rgba(226,75,74,0.5)" : undefined,
                }}
              />
              <span className="mt-0.5 font-mono whitespace-nowrap" style={{ fontSize: "9px", color: isDark ? "#6b7280" : "#4b5563" }}>
                {port.name}
              </span>
            </div>
          </OverlayView>
        );
      })}

      {/* Disruption pulse rings */}
      {disruptionActive && (
        <>
          <Circle
            center={disruptionCenter}
            radius={pulseRadius}
            options={{
              fillColor: "#E24B4A",
              fillOpacity: Math.max(0, 0.15 - (pulseRadius / 180000) * 0.15),
              strokeColor: "#E24B4A",
              strokeWeight: 1.5,
              strokeOpacity: Math.max(0, 0.6 - (pulseRadius / 180000) * 0.6),
            }}
          />
          <Circle
            center={disruptionCenter}
            radius={25000}
            options={{
              fillColor: "#E24B4A",
              fillOpacity: 0.35,
              strokeColor: "#E24B4A",
              strokeWeight: 2,
              strokeOpacity: 0.8,
            }}
          />
          <OverlayView
            position={disruptionCenter}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative -translate-x-1/2 translate-y-6 pointer-events-none">
              <div
                className="px-2 py-1 rounded animate-pulse"
                style={{
                  background: "rgba(226,75,74,0.15)",
                  border: "1px solid rgba(226,75,74,0.4)",
                }}
              >
                <span className="font-mono whitespace-nowrap" style={{ fontSize: "10px", fontWeight: 700, color: "#E24B4A" }}>
                  TYPHOON GAEMI
                </span>
              </div>
            </div>
          </OverlayView>
        </>
      )}

      {/* Cascade impact rings */}
      {cascadeImpacts.map((impact) => {
        const port = PORTS[impact.port_id];
        if (!port) return null;
        const intensity = impact.delay_days / 5;
        return (
          <Circle
            key={`cascade-${impact.port_id}`}
            center={{ lat: port.lat, lng: port.lng }}
            radius={30000 + intensity * 40000}
            options={{
              fillColor: "#E24B4A",
              fillOpacity: 0.08 + intensity * 0.12,
              strokeColor: "#E24B4A",
              strokeWeight: 1,
              strokeOpacity: 0.3 + intensity * 0.3,
            }}
          />
        );
      })}
    </GoogleMap>
  );
}
