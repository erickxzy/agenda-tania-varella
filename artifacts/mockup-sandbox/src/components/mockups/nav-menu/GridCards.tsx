export function GridCards() {
  const grupos = [
    {
      titulo: "Conteúdo Escolar",
      cor: "#3b82f6",
      itens: [
        { icone: "📢", label: "Avisos" },
        { icone: "📝", label: "Provas" },
        { icone: "✅", label: "Tarefas" },
        { icone: "📅", label: "Eventos" },
      ],
    },
    {
      titulo: "Turma & Professores",
      cor: "#10b981",
      itens: [
        { icone: "🧑‍🎓", label: "Turmas" },
        { icone: "👨‍🏫", label: "Professores" },
        { icone: "🍽️", label: "Cardápio" },
        { icone: "🏆", label: "Destaques" },
      ],
    },
    {
      titulo: "Comunicação",
      cor: "#a855f7",
      itens: [
        { icone: "💬", label: "Dúvidas" },
        { icone: "💬", label: "Mensagens" },
        { icone: "📊", label: "Enquetes" },
        { icone: "🔔", label: "Solicitações" },
      ],
    },
    {
      titulo: "Administração",
      cor: "#f97316",
      itens: [
        { icone: "📊", label: "Logs" },
        { icone: "🔑", label: "Contas Direção" },
      ],
    },
  ];

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", padding: "16px", fontFamily: "Inter, sans-serif" }}>
      {grupos.map((grupo, gi) => (
        <div key={gi} style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ width: "3px", height: "16px", background: grupo.cor, borderRadius: "2px" }} />
            <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              {grupo.titulo}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
            {grupo.itens.map((item, i) => (
              <div key={i} style={{
                background: gi === 0 && i === 0 ? `linear-gradient(135deg, ${grupo.cor}22, ${grupo.cor}44)` : "#1e293b",
                border: gi === 0 && i === 0 ? `1.5px solid ${grupo.cor}88` : "1px solid #334155",
                borderRadius: "12px",
                padding: "12px 6px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: "22px" }}>{item.icone}</span>
                <span style={{
                  fontSize: "9px",
                  color: gi === 0 && i === 0 ? grupo.cor : "#94a3b8",
                  fontWeight: "600",
                  textAlign: "center",
                  lineHeight: 1.2,
                }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
