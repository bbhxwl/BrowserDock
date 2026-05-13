"""生成 1024x1024 应用图标：渐变圆角方块 + 居中"斌"字"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SIZE = 1024
RADIUS = 220  # macOS Big Sur 风格圆角
OUT = os.path.join(os.path.dirname(__file__), "icon.png")


def find_cjk_font():
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/STHeiti Medium.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/Library/Fonts/Songti.ttc",
        "/System/Library/Fonts/Supplemental/Songti.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "C:/Windows/Fonts/msyh.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None


def gradient_square(size, c1, c2):
    """竖向线性渐变 RGBA 图像"""
    img = Image.new("RGBA", (size, size), c1)
    top = Image.new("RGBA", (size, 1))
    px = top.load()
    px[0, 0] = c1
    base = Image.new("RGBA", (size, size), c1)
    draw_base = ImageDraw.Draw(base)
    for y in range(size):
        t = y / (size - 1)
        r = int(c1[0] * (1 - t) + c2[0] * t)
        g = int(c1[1] * (1 - t) + c2[1] * t)
        b = int(c1[2] * (1 - t) + c2[2] * t)
        a = int(c1[3] * (1 - t) + c2[3] * t)
        draw_base.line([(0, y), (size, y)], fill=(r, g, b, a))
    return base


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def main():
    bg = gradient_square(SIZE, (47, 109, 246, 255), (95, 60, 220, 255))  # 蓝→紫
    mask = rounded_mask(SIZE, RADIUS)
    icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    icon.paste(bg, (0, 0), mask)

    # 内描边
    edge = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ed = ImageDraw.Draw(edge)
    ed.rounded_rectangle((4, 4, SIZE - 5, SIZE - 5), radius=RADIUS - 4,
                         outline=(255, 255, 255, 60), width=6)
    icon = Image.alpha_composite(icon, edge)

    font_path = find_cjk_font()
    if not font_path:
        print("WARN: no CJK font found, using default", file=sys.stderr)
        font = ImageFont.load_default()
    else:
        font = ImageFont.truetype(font_path, 720)

    text = "斌"
    draw = ImageDraw.Draw(icon)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (SIZE - tw) // 2 - bbox[0]
    ty = (SIZE - th) // 2 - bbox[1] - 20

    # 字下方阴影
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ds = ImageDraw.Draw(shadow)
    ds.text((tx + 6, ty + 10), text, fill=(0, 0, 0, 130), font=font)
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    icon = Image.alpha_composite(icon, shadow)

    draw = ImageDraw.Draw(icon)
    draw.text((tx, ty), text, fill=(255, 255, 255, 255), font=font)

    icon.save(OUT, "PNG")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
