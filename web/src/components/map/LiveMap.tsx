import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

// Fix default icon issue in Leaflet with webpack/vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapMarker {
    id: string | number
    name: string
    x: number
    y: number
    heading?: number
}

interface LiveMapProps {
    markers: MapMarker[]
    centerOnMarkerId?: string | number | null
}

// Helper to re-center map when target changes
function MapController({ centerOnMarkerId, markers }: { centerOnMarkerId?: string | number | null, markers: MapMarker[] }) {
    const map = useMap()

    useEffect(() => {
        if (centerOnMarkerId && markers.length > 0) {
            const target = markers.find(m => String(m.id) === String(centerOnMarkerId))
            if (target) {
                // GTA coords are usually (x, y) but Leaflet uses (lat, lng) -> (y, x)
                // For Simple CRS, it's often mapped directly (y, x)
                map.flyTo([target.y, target.x], 3)
            }
        }
    }, [centerOnMarkerId, markers, map])

    return null
}

const GTACenter = [0, 0] as L.LatLngExpression

export default function LiveMap({ markers, centerOnMarkerId }: LiveMapProps) {
    // GTA V Coordinate Configuration
    // Using standard coefficients found in community GTA V map projects (like TGRHavoc/LiveMap)
    const center_x = 117.3;
    const center_y = 172.8;
    const scale_x = 0.02072;
    const scale_y = 0.0205;

    // Custom CRS for GTA V
    const GtaVCrs = L.Util.extend({}, L.CRS.Simple, {
        transformation: new L.Transformation(scale_x, center_x, -scale_y, center_y)
    });

    return (
        <MapContainer
            center={[0, 0]}
            zoom={2}
            scrollWheelZoom={true}
            maxZoom={5}
            minZoom={0}
            crs={GtaVCrs}
            style={{ height: '100%', width: '100%', borderRadius: '0.75rem', overflow: 'hidden', background: 'transparent' }}
        >
            <TileLayer
                attribution='&copy; GTA 5 Map'
                url="./map/tiles/{z}/{x}/{y}.webp"
                noWrap={true}
                tileSize={256}
                minZoom={0}
                maxZoom={5}
            />

            {markers.map(marker => (
                 <Marker key={marker.id} position={[marker.y, marker.x]}>
                        <Tooltip direction="top" offset={[0, -40]} opacity={1} permanent>
                            <span className="font-bold">{marker.name}</span>
                        </Tooltip>
                        <Popup>
                            <div className="text-sm font-medium">
                                <div>ID: {marker.id}</div>
                                <div>Name: {marker.name}</div>
                                <div>X: {marker.x.toFixed(2)}</div>
                                <div>Y: {marker.y.toFixed(2)}</div>
                            </div>
                        </Popup>
                    </Marker>
            ))}

            <MapController centerOnMarkerId={centerOnMarkerId} markers={markers} />
        </MapContainer>
    )
}
