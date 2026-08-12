from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter


ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT = 1920, 1080

GROUPS = [
    (
        "KAIZO · Visão geral e entrada",
        "Dashboard, navegação e início do atendimento",
        [
            ("01-dashboard.png", "Dashboard"),
            ("02-mais.png", "Menu Mais"),
            ("03-atendimentos.png", "Atendimentos"),
            ("04-novo-atendimento.png", "Novo atendimento"),
            ("05-atendimento-resumo.png", "Resumo"),
            ("06-diagnostico.png", "Diagnóstico"),
        ],
        "kaizo-colagem-01-visao-geral.png",
    ),
    (
        "KAIZO · Diagnóstico e orçamento",
        "Evidências, proposta comercial, aprovação e início da OS",
        [
            ("07-evidencias.png", "Evidências"),
            ("08-orcamentos.png", "Orçamentos"),
            ("09-orcamento-detalhe.png", "Detalhe"),
            ("10-visao-cliente.png", "Visão do cliente"),
            ("11-orcamento-aprovado.png", "Aprovado"),
            ("12-ordens-servico.png", "Ordens de serviço"),
        ],
        "kaizo-colagem-02-orcamentos.png",
    ),
    (
        "KAIZO · Execução e relacionamento",
        "Serviço autorizado, pagamento e histórico do cliente",
        [
            ("13-os-detalhe.png", "Detalhe da OS"),
            ("14-pagamento.png", "Pagamento"),
            ("15-clientes.png", "Clientes"),
            ("16-cliente-historico.png", "Histórico"),
            ("17-novo-cliente.png", "Novo cliente"),
        ],
        "kaizo-colagem-03-execucao.png",
    ),
    (
        "KAIZO · Veículos e agenda",
        "Garagem, histórico do veículo e organização operacional",
        [
            ("18-veiculos.png", "Veículos"),
            ("19-veiculo-historico.png", "Histórico"),
            ("20-novo-veiculo.png", "Novo veículo"),
            ("21-agenda.png", "Agenda"),
            ("22-novo-agendamento.png", "Novo agendamento"),
        ],
        "kaizo-colagem-04-veiculos-agenda.png",
    ),
    (
        "KAIZO · Operação e gestão",
        "Pós-venda, receita, indicadores, configurações e alertas",
        [
            ("23-pos-venda.png", "Pós-venda"),
            ("24-financeiro.png", "Financeiro"),
            ("25-relatorios.png", "Relatórios"),
            ("26-configuracoes.png", "Configurações"),
            ("27-notificacoes.png", "Notificações"),
        ],
        "kaizo-colagem-05-gestao.png",
    ),
]


def font(path: str, size: int):
    return ImageFont.truetype(path, size)


REGULAR = "C:/Windows/Fonts/segoeui.ttf"
BOLD = "C:/Windows/Fonts/segoeuib.ttf"


def make_background():
    canvas = Image.new("RGB", (WIDTH, HEIGHT), "#090D14")
    glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((1320, -350, 2180, 510), fill=(37, 99, 235, 45))
    glow_draw.ellipse((-480, 680, 380, 1540), fill=(59, 130, 246, 22))
    glow = glow.filter(ImageFilter.GaussianBlur(95))
    canvas.paste(glow, (0, 0), glow)
    return canvas


def rounded_screen(screen: Image.Image, size: tuple[int, int]):
    screen = screen.convert("RGB").resize(size, Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=20, fill=255)
    result = Image.new("RGBA", size, (0, 0, 0, 0))
    result.paste(screen, (0, 0), mask)
    return result


def compose(title, subtitle, screens, output):
    canvas = make_background()
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((64, 48, 76, 128), radius=6, fill="#2563EB")
    draw.text((98, 43), title, font=font(BOLD, 46), fill="#F8FAFC")
    draw.text((100, 105), subtitle, font=font(REGULAR, 21), fill="#94A3B8")
    draw.text((1758, 55), "16:9", font=font(BOLD, 20), fill="#60A5FA")
    draw.text((1686, 87), "1920 × 1080", font=font(REGULAR, 16), fill="#64748B")

    count = len(screens)
    target_h = 620 if count == 6 else 690
    target_w = round(target_h * 390 / 844)
    gap = 22 if count == 6 else 34
    total_w = count * target_w + (count - 1) * gap
    start_x = (WIDTH - total_w) // 2
    screen_y = 245 if count == 6 else 220

    for index, (file_name, label) in enumerate(screens):
        x = start_x + index * (target_w + gap)
        shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle(
            (x - 8, screen_y - 8, x + target_w + 8, screen_y + target_h + 8),
            radius=28,
            fill=(0, 0, 0, 145),
        )
        shadow = shadow.filter(ImageFilter.GaussianBlur(14))
        canvas.paste(shadow, (0, 0), shadow)

        draw.rounded_rectangle(
            (x - 3, screen_y - 3, x + target_w + 3, screen_y + target_h + 3),
            radius=24,
            fill="#151E2B",
            outline="#27364A",
            width=2,
        )
        screen = rounded_screen(Image.open(ROOT / file_name), (target_w, target_h))
        canvas.paste(screen, (x, screen_y), screen)

        label_box = draw.textbbox((0, 0), label, font=font(BOLD, 18))
        label_w = label_box[2] - label_box[0]
        label_y = screen_y + target_h + 24
        draw.rounded_rectangle(
            (x + (target_w - label_w) // 2 - 14, label_y - 7, x + (target_w + label_w) // 2 + 14, label_y + 30),
            radius=18,
            fill="#101722",
            outline="#1E293B",
        )
        draw.text((x + (target_w - label_w) // 2, label_y), label, font=font(BOLD, 18), fill="#F8FAFC")

    draw.line((64, 1020, 1856, 1020), fill="#1E293B", width=1)
    draw.text((64, 1035), "KAIZO · Gestão automotiva local-first", font=font(REGULAR, 15), fill="#64748B")
    draw.text((1610, 1035), "Mobile · 390 × 844", font=font(REGULAR, 15), fill="#64748B")
    canvas.save(ROOT / output, "PNG", optimize=True)


for group in GROUPS:
    compose(*group)


def compose_master():
    canvas = make_background()
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((64, 40, 76, 120), radius=6, fill="#2563EB")
    draw.text((98, 35), "KAIZO · Todas as telas", font=font(BOLD, 44), fill="#F8FAFC")
    draw.text((100, 94), "Visão completa do aplicativo mobile", font=font(REGULAR, 20), fill="#94A3B8")
    draw.text((1758, 48), "16:9", font=font(BOLD, 20), fill="#60A5FA")
    draw.text((1686, 80), "1920 × 1080", font=font(REGULAR, 16), fill="#64748B")

    screens = [item for group in GROUPS for item in group[2]]
    screen_h = 250
    screen_w = round(screen_h * 390 / 844)
    columns = 9
    gap_x = 20
    row_step = 292
    total_w = columns * screen_w + (columns - 1) * gap_x
    start_x = (WIDTH - total_w) // 2
    start_y = 158

    for index, (file_name, label) in enumerate(screens):
        row, column = divmod(index, columns)
        x = start_x + column * (screen_w + gap_x)
        y = start_y + row * row_step
        draw.rounded_rectangle(
            (x - 2, y - 2, x + screen_w + 2, y + screen_h + 2),
            radius=12,
            fill="#151E2B",
            outline="#27364A",
            width=1,
        )
        screen = rounded_screen(Image.open(ROOT / file_name), (screen_w, screen_h))
        canvas.paste(screen, (x, y), screen)
        label_box = draw.textbbox((0, 0), label, font=font(BOLD, 12))
        label_w = label_box[2] - label_box[0]
        if label_w > screen_w + 20:
            label = label[:16] + "…"
            label_box = draw.textbbox((0, 0), label, font=font(BOLD, 12))
            label_w = label_box[2] - label_box[0]
        draw.text(
            (x + (screen_w - label_w) // 2, y + screen_h + 10),
            label,
            font=font(BOLD, 12),
            fill="#CBD5E1",
        )

    canvas.save(ROOT / "kaizo-colagem-00-todas-as-telas.png", "PNG", optimize=True)


compose_master()

print("kaizo-colagem-00-todas-as-telas.png")
print("\n".join(group[3] for group in GROUPS))
