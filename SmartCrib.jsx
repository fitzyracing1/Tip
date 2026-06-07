import { useState, useEffect, useRef } from "react";

const WEIGHT_THRESHOLDS = {
  newborn: { min: 2.5, max: 4.5, oz: 2, label: "Newborn" },
  oneMonth: { min: 4.5, max: 6.0, oz: 3, label: "1–2 mo" },
  twoMonth: { min: 6.0, max: 7.5, oz: 4, label: "2–4 mo" },
  fourMonth: { min: 7.5, max: 9.5, oz: 5, label: "4–6 mo" },
  sixMonth: { min: 9.5, max: 13.0, oz: 6, label: "6+ mo" },
};

function getMilkRecommendation(weightKg) {
  for (const stage of Object.values(WEIGHT_THRESHOLDS)) {
    if (weightKg >= stage.min && weightKg < stage.max) return stage;
  }
  if (weightKg < 2.5) return { oz: 1.5, label: "Premature" };
  return { oz: 7, label: "6+ mo" };
}

function PrepTimer({ oz, onDone }) {
  // ~30 sec per oz as a simplified demo (real would be longer)
  const totalSec = oz * 8;
  const [sec, setSec] = useState(totalSec);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (running && sec > 0) {
      ref.current = setInterval(() => setSec(s => s - 1), 1000);
    } else if (sec <= 0) {
      clearInterval(ref.current);
      setRunning(false);
      setDone(true);
      onDone && onDone();
    }
    return () => clearInterval(ref.current);
  }, [running, sec]);

  const pct = ((totalSec - sec) / totalSec) * 100;
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,220,100,0.2)",
      borderRadius: 16,
      padding: "20px 24px",
      marginTop: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#a0b0c0", letterSpacing: "0.08em", textTransform: "uppercase" }}>Prep Timer</span>
        <span style={{ fontSize: 11, color: "#ffdc64", background: "rgba(255,220,100,0.1)", padding: "3px 10px", borderRadius: 20 }}>{oz} oz formula</span>
      </div>

      {/* Progress bar */}
      <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, height: 8, marginBottom: 14, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: done ? "#5effa0" : "linear-gradient(90deg, #ffdc64, #ff9d4d)",
          borderRadius: 8,
          transition: "width 0.9s linear",
        }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{
          fontSize: 36,
          fontFamily: "'DM Mono', monospace",
          color: done ? "#5effa0" : "#fff",
          letterSpacing: "-0.02em",
          minWidth: 80,
        }}>
          {done ? "✓ Done" : `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`}
        </span>
        {!done && (
          <button
            onClick={() => setRunning(r => !r)}
            style={{
              background: running ? "rgba(255,100,100,0.15)" : "rgba(94,255,160,0.15)",
              border: `1px solid ${running ? "rgba(255,100,100,0.4)" : "rgba(94,255,160,0.4)"}`,
              color: running ? "#ff6464" : "#5effa0",
              borderRadius: 10,
              padding: "8px 20px",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.05em",
            }}
          >{running ? "Pause" : "Start"}</button>
        )}
        {!done && (
          <button
            onClick={() => { setSec(totalSec); setRunning(false); }}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#607080",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >Reset</button>
        )}
      </div>

      {!running && !done && (
        <p style={{ fontSize: 11, color: "#607080", marginTop: 10, marginBottom: 0 }}>
          Steps: heat water → add {oz} scoops formula → shake 30s → cool to ~98°F → serve
        </p>
      )}
      {done && (
        <p style={{ fontSize: 12, color: "#5effa0", marginTop: 8, marginBottom: 0 }}>
          🍼 Milk is ready! Check temperature before feeding.
        </p>
      )}
    </div>
  );
}

function Sensor({ icon, label, value, unit, color, active }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${active ? color + "55" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      overflow: "hidden",
    }}>
      {active && <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
      }} />}
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 11, color: "#607080", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <span style={{ fontSize: 18, color: active ? color : "#3a4a5a", fontFamily: "'DM Mono', monospace" }}>
        {value}<span style={{ fontSize: 11, marginLeft: 3, color: "#607080" }}>{unit}</span>
      </span>
    </div>
  );
}

export default function SmartCrib() {
  const [weightKg, setWeightKg] = useState(5.2);
  const [showTimer, setShowTimer] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [wifiStrength] = useState(3);
  const [lastFed, setLastFed] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const rec = getMilkRecommendation(weightKg);
  const lbsOz = `${Math.floor(weightKg * 2.205)} lb ${Math.round((weightKg * 2.205 % 1) * 16)} oz`;
  const feedInterval = rec.oz <= 2 ? 2 : rec.oz <= 4 ? 3 : 4;
  const minsSinceFed = lastFed ? Math.floor((currentTime - lastFed) / 60000) : null;
  const hungerAlert = minsSinceFed !== null && minsSinceFed >= feedInterval * 60 - 10;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070d14",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#d0e0f0",
      padding: "28px 20px",
      maxWidth: 480,
      margin: "0 auto",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        input[type=range] { accent-color: #ffdc64; width: 100%; }
        body { background: #070d14; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 11, color: "#607080", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
            Smart Crib Monitor
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#e8f4ff", letterSpacing: "-0.02em" }}>
            Baby Dashboard
          </h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontFamily: "'DM Mono', monospace", color: "#ffdc64" }}>
            {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div style={{ fontSize: 11, color: "#405060" }}>
            {"▂▄▆"[wifiStrength - 1]}▆ WiFi
          </div>
        </div>
      </div>

      {/* Hunger Alert */}
      {hungerAlert && !alertDismissed && (
        <div style={{
          background: "rgba(255,180,50,0.1)",
          border: "1px solid rgba(255,180,50,0.4)",
          borderRadius: 14,
          padding: "14px 16px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#ffb432" }}>🍼 Feeding Time Soon</div>
            <div style={{ fontSize: 12, color: "#a08060", marginTop: 3 }}>
              Last fed {minsSinceFed}m ago · next feed in ~{feedInterval * 60 - minsSinceFed}m
            </div>
          </div>
          <button onClick={() => setAlertDismissed(true)} style={{
            background: "transparent", border: "none", color: "#607080", fontSize: 18, cursor: "pointer", padding: 4
          }}>×</button>
        </div>
      )}

      {/* Weight Card — Hero */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255,220,100,0.08), rgba(255,150,60,0.05))",
        border: "1px solid rgba(255,220,100,0.25)",
        borderRadius: 20,
        padding: "22px 24px",
        marginBottom: 16,
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -30, right: -30,
          width: 120, height: 120,
          background: "radial-gradient(circle, rgba(255,220,100,0.08), transparent 70%)",
          borderRadius: "50%",
        }} />
        <div style={{ fontSize: 11, color: "#806040", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
          ⚖️ Weight Sensor
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 48, fontFamily: "'DM Mono', monospace", fontWeight: 500, color: "#ffdc64", letterSpacing: "-0.03em" }}>
            {weightKg.toFixed(1)}
          </span>
          <span style={{ fontSize: 16, color: "#806040" }}>kg</span>
          <span style={{ fontSize: 14, color: "#607080", marginLeft: 4 }}>({lbsOz})</span>
        </div>

        {/* Slider */}
        <div style={{ marginBottom: 14 }}>
          <input
            type="range" min="2.0" max="12.0" step="0.1"
            value={weightKg}
            onChange={e => { setWeightKg(+e.target.value); setShowTimer(false); setAlertDismissed(false); }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#405060", marginTop: 2 }}>
            <span>2 kg</span><span>Adjust baby weight</span><span>12 kg</span>
          </div>
        </div>

        {/* Stage chip */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            background: "rgba(255,220,100,0.15)", border: "1px solid rgba(255,220,100,0.3)",
            color: "#ffdc64", borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 500,
          }}>{rec.label}</span>
          <span style={{ fontSize: 13, color: "#a0b0c0" }}>
            Recommended: <strong style={{ color: "#fff" }}>{rec.oz} oz</strong> per feed
          </span>
        </div>

        {/* Feed freq */}
        <div style={{
          marginTop: 14, padding: "10px 14px",
          background: "rgba(0,0,0,0.2)", borderRadius: 10,
          fontSize: 12, color: "#809090", lineHeight: 1.6,
        }}>
          📅 Feed every <strong style={{ color: "#ffdc64" }}>{feedInterval} hrs</strong> ·
          approx <strong style={{ color: "#ffdc64" }}>{Math.round(24 / feedInterval)}</strong> feeds/day ·
          ~<strong style={{ color: "#ffdc64" }}>{rec.oz * Math.round(24 / feedInterval)} oz</strong> total daily
        </div>

        <button
          onClick={() => setShowTimer(t => !t)}
          style={{
            marginTop: 16,
            width: "100%",
            background: showTimer ? "rgba(94,255,160,0.1)" : "rgba(255,220,100,0.12)",
            border: `1px solid ${showTimer ? "rgba(94,255,160,0.3)" : "rgba(255,220,100,0.3)"}`,
            color: showTimer ? "#5effa0" : "#ffdc64",
            borderRadius: 12,
            padding: "12px",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}
        >
          {showTimer ? "✓ Prep Timer Running" : "🍼 Start Milk Prep Timer"}
        </button>
        <button
          onClick={() => { setLastFed(new Date()); setAlertDismissed(false); }}
          style={{
            marginTop: 8,
            width: "100%",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#607080",
            borderRadius: 12,
            padding: "10px",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >Log Feed Now {lastFed ? `· last: ${lastFed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</button>
      </div>

      {showTimer && <PrepTimer oz={rec.oz} onDone={() => {}} />}

      {/* Sensor Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "20px 0" }}>
        <Sensor icon="📹" label="Camera" value={cameraOn ? "Live" : "Off"} unit="" color="#5effa0" active={cameraOn} />
        <Sensor icon="🎙" label="Audio" value={audioOn ? "Listening" : "Muted"} unit="" color="#64c8ff" active={audioOn} />
        <Sensor icon="🌡" label="Room Temp" value="72" unit="°F" color="#ff9d4d" active={true} />
        <Sensor icon="💧" label="Humidity" value="48" unit="%" color="#64c8ff" active={true} />
      </div>

      {/* Toggles */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        overflow: "hidden",
        marginBottom: 16,
      }}>
        {[
          { label: "Camera Monitor", sub: "Live feed active", val: cameraOn, set: setCameraOn, icon: "📹" },
          { label: "Audio Monitor", sub: "Crying detection on", val: audioOn, set: setAudioOn, icon: "🎙" },
        ].map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: i === 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, color: "#c0d0e0" }}>{item.label}</div>
                <div style={{ fontSize: 11, color: "#405060" }}>{item.sub}</div>
              </div>
            </div>
            <div
              onClick={() => item.set(v => !v)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: item.val ? "#5effa0" : "rgba(255,255,255,0.1)",
                position: "relative", cursor: "pointer", transition: "background 0.2s",
              }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 3,
                left: item.val ? 23 : 3,
                transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Milk guide */}
      <div style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "16px 18px",
      }}>
        <div style={{ fontSize: 11, color: "#607080", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          📊 Weight → Milk Reference
        </div>
        {Object.values(WEIGHT_THRESHOLDS).map((stage, i) => {
          const active = weightKg >= stage.min && weightKg < stage.max;
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 12px", borderRadius: 8, marginBottom: 4,
              background: active ? "rgba(255,220,100,0.08)" : "transparent",
              border: active ? "1px solid rgba(255,220,100,0.2)" : "1px solid transparent",
            }}>
              <span style={{ fontSize: 12, color: active ? "#ffdc64" : "#506070" }}>{stage.label}</span>
              <span style={{ fontSize: 11, color: "#405060" }}>{stage.min}–{stage.max} kg</span>
              <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: active ? "#fff" : "#405060" }}>
                {stage.oz} oz
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 10, color: "#304050", textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
        Smart Crib Monitor · Always verify with your pediatrician<br/>
        Weight sensor · Camera · Audio · WiFi connected
      </div>
    </div>
  );
}
