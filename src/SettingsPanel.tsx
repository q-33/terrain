interface Props {
  fogDensity: number;
  onFogDensity: (v: number) => void;
  viewDistance: number;
  onViewDistance: (v: number) => void;
}

const Slider = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}): JSX.Element => (
  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span>{label}</span>
      <span style={{ opacity: 0.55 }}>{value}%</span>
    </div>
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: "100%", accentColor: "#8fb4c8", cursor: "pointer" }}
    />
  </label>
);

const SettingsPanel = ({
  fogDensity,
  onFogDensity,
  viewDistance,
  onViewDistance,
}: Props): JSX.Element => (
  <div
    style={{
      position: "fixed",
      bottom: 16,
      right: 16,
      background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(6px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 10,
      padding: "12px 16px",
      color: "rgba(255,255,255,0.8)",
      fontFamily: "monospace",
      fontSize: 12,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      minWidth: 180,
      userSelect: "none",
    }}
  >
    <div
      style={{
        fontWeight: "bold",
        letterSpacing: "0.08em",
        opacity: 0.6,
        fontSize: 10,
      }}
    >
      SETTINGS
    </div>

    <Slider label="Fog density" value={fogDensity} onChange={onFogDensity} />
    <Slider
      label="View distance"
      value={viewDistance}
      onChange={onViewDistance}
    />
  </div>
);

export default SettingsPanel;
