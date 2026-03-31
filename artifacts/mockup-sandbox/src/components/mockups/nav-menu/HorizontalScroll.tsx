export function HorizontalScroll() {
  const itens = [
    { icone: "🧑‍🎓", label: "Turmas" },
    { icone: "📢", label: "Avisos" },
    { icone: "🍽️", label: "Cardápio" },
    { icone: "📊", label: "Logs" },
    { icone: "📅", label: "Eventos" },
    { icone: "👨‍🏫", label: "Professores" },
    { icone: "📝", label: "Provas" },
    { icone: "💬", label: "Dúvidas" },
    { icone: "✅", label: "Tarefas" },
    { icone: "📊", label: "Enquetes" },
    { icone: "🏆", label: "Destaques" },
    { icone: "💬", label: "Mensagens" },
    { icone: "🔔", label: "Solicitações" },
    { icone: "🔑", label: "Contas Direção" },
  ];

  return (
    <div style={{ background: "#1a1a2e", minHeight: "100vh", padding: "16px", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: "#16213e", borderRadius: "16px", padding: "16px 12px", marginBottom: "20px" }}>
        <p style={{ color: "#888", fontSize: "10px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px", paddingLeft: "4px" }}>Navegação</p>
        <div style={{
          display: "flex",
          overflowX: "auto",
          gap: "8px",
          paddingBottom: "6px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {itens.map((item, i) => (
            <div key={i} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "5px",
              minWidth: "58px",
              cursor: "pointer",
            }}>
              <div style={{
                width: "46px",
                height: "46px",
                borderRadius: "14px",
                background: i === 4 ? "linear-gradient(135deg, #f97316, #ea580c)" : "#1e293b",
                border: i === 4 ? "none" : "1px solid #334155",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                boxShadow: i === 4 ? "0 4px 12px rgba(249,115,22,0.4)" : "none",
              }}>
                {item.icone}
              </div>
              <span style={{
                fontSize: "9px",
                color: i === 4 ? "#f97316" : "#94a3b8",
                fontWeight: i === 4 ? "700" : "500",
                textAlign: "center",
                lineHeight: 1.2,
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#16213e", borderRadius: "16px", padding: "20px", border: "1px solid #1e293b" }}>
        <h3 style={{ color: "#f97316", fontSize: "18px", fontWeight: "700", marginBottom: "16px", borderBottom: "2px solid #f97316", paddingBottom: "10px" }}>
          📅 Eventos
        </h3>
        <p style={{ color: "#64748b", fontSize: "13px" }}>Conteúdo da seção selecionada aparece aqui...</p>
      </div>
    </div>
  );
}
