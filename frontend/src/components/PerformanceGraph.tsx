import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const data = [
  { day: 'Mon', actual: 4, ideal: 6 },
  { day: 'Tue', actual: 5, ideal: 6 },
  { day: 'Wed', actual: 7, ideal: 6 },
  { day: 'Thu', actual: 3, ideal: 6 },
  { day: 'Fri', actual: 6, ideal: 6 },
  { day: 'Sat', actual: 8, ideal: 4 },
  { day: 'Sun', actual: 4, ideal: 4 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--outline-variant)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 700, fontSize: 13 }}>{label}</p>
        <p style={{ margin: 0, color: 'var(--primary)', fontSize: 12, fontWeight: 600 }}>
          Studied: {payload[0].value * 60} mins
        </p>
        <p style={{ margin: '4px 0 0 0', color: 'var(--on-surface-variant)', fontSize: 12, fontWeight: 500 }}>
          Target: {payload[1].value * 60} mins
        </p>
      </div>
    );
  }
  return null;
};

// We use a custom shape to render the Ideal bar as a hollow outline around the actual bar
const IdealBarShape = (props: any) => {
  const { x, y, width, height, fill } = props;
  const radius = 6;
  return (
    <path
      d={`M${x},${y + radius} a${radius},${radius} 0 0 1 ${radius},-${radius} h${width - 2 * radius} a${radius},${radius} 0 0 1 ${radius},${radius} v${height - radius} h-${width} Z`}
      fill="none"
      stroke={fill}
      strokeWidth={2}
      strokeDasharray="4 4"
    />
  );
};

export function PerformanceGraph() {
  return (
    <div className="card-glass focus-card" style={{ padding: 24, paddingBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Performance</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)' }} /> Actual
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--on-surface-variant)', fontWeight: 600 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, border: '2px dashed #CBD5E1' }} /> Ideal
          </div>
        </div>
      </div>

      <div style={{ height: 220, width: '100%', minWidth: 0, minHeight: 220 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={32}>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--on-surface-variant)', fontSize: 12, fontWeight: 600 }} dy={8} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-high)', opacity: 0.5, radius: 8 }} />
            {/* Layering the bars. Actual sits on top. Ideal uses our custom dashed path shape behind. */}
            <Bar dataKey="ideal" fill="#CBD5E1" shape={<IdealBarShape />} />
            <Bar dataKey="actual" fill="var(--primary)" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.actual >= entry.ideal ? 'var(--primary)' : '#8FAE8F'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
