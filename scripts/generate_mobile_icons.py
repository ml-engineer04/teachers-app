import re
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw
import os

SVG_PATH = 'apps/web/public/logo.svg'
RES_DIR = 'apps/mobile/android/app/src/main/res'
ASSETS_DIR = 'apps/mobile/assets'

# Parse polygons from SVG
tree = ET.parse(SVG_PATH)
root = tree.getroot()
paths = root.findall('.//{http://www.w3.org/2000/svg}path')

polygons = []
for p in paths:
    d = p.attrib.get('d', '')
    coords = re.findall(r'([-\d.]+)[,\s]+([-\d.]+)', d)
    poly = [(float(x), float(y)) for x, y in coords]
    polygons.append(poly)

# SVG viewBox is 0 0 164 164
VB_SIZE = 164.0

def render_logo_vector(size, target_content_ratio=0.85):
    """
    Renders the Ilmchi logo with supersampling and exact linear gradient #078BFA to #4825E8.
    """
    # Supersampling factor for smooth vector edges
    ss = 4
    canvas_size = size * ss
    content_size = canvas_size * target_content_ratio
    offset = (canvas_size - content_size) / 2.0
    scale = content_size / VB_SIZE

    # 1. Create supersampled mask for the polygons
    mask = Image.new('L', (canvas_size, canvas_size), 0)
    draw_mask = ImageDraw.Draw(mask)

    for poly in polygons:
        scaled_pts = [(offset + x * scale, offset + y * scale) for x, y in poly]
        draw_mask.polygon(scaled_pts, fill=255)

    # 2. Create diagonal linear gradient from #078BFA (7, 139, 250) to #4825E8 (72, 37, 232)
    c1 = (7, 139, 250)
    c2 = (72, 37, 232)
    
    gradient = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    grad_pixels = gradient.load()
    
    # Precompute line gradient diagonally (x + y) / (2 * canvas_size)
    total_diag = 2.0 * canvas_size
    for y in range(canvas_size):
        for x in range(canvas_size):
            t = (x + y) / total_diag
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            grad_pixels[x, y] = (r, g, b, 255)

    # 3. Apply mask to gradient
    gradient.putalpha(mask)

    # 4. Downsample with Lanczos to final target size for anti-aliasing
    final_img = gradient.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def create_launcher_square(size, radius_ratio=0.22):
    bg_color = (20, 36, 82, 255) # #142452
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    draw.rounded_rectangle([(0, 0), (size - 1, size - 1)], radius=r, fill=bg_color)
    
    # Logo mark inside
    logo = render_logo_vector(size, target_content_ratio=0.64)
    img.alpha_composite(logo)
    return img

def create_launcher_round(size):
    bg_color = (20, 36, 82, 255) # #142452
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.ellipse([(0, 0), (size - 1, size - 1)], fill=bg_color)
    
    # Logo mark inside
    logo = render_logo_vector(size, target_content_ratio=0.60)
    img.alpha_composite(logo)
    return img

def create_launcher_foreground(size):
    # Foreground has transparent background; logo in center (64% size for safe zone)
    return render_logo_vector(size, target_content_ratio=0.62)

def generate_all():
    print('Generating high-resolution Expo app assets...')
    # 1. icon.png (1024x1024)
    icon_1024 = create_launcher_square(1024, radius_ratio=0.20)
    icon_1024.save(os.path.join(ASSETS_DIR, 'icon.png'), format='PNG')
    print('Saved assets/icon.png')

    # 2. adaptive-icon.png (1024x1024)
    adaptive_1024 = create_launcher_foreground(1024)
    adaptive_1024.save(os.path.join(ASSETS_DIR, 'adaptive-icon.png'), format='PNG')
    print('Saved assets/adaptive-icon.png')

    # 3. splash.png (1024x1024 on brand bg #142452)
    splash_1024 = Image.new('RGBA', (1024, 1024), (20, 36, 82, 255))
    splash_logo = render_logo_vector(1024, target_content_ratio=0.38)
    splash_1024.alpha_composite(splash_logo)
    splash_1024.save(os.path.join(ASSETS_DIR, 'splash.png'), format='PNG')
    print('Saved assets/splash.png')

    # 4. Android mipmap densities
    densities = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432),
    }

    for folder, (std_size, fg_size) in densities.items():
        dir_path = os.path.join(RES_DIR, folder)
        os.makedirs(dir_path, exist_ok=True)

        # ic_launcher.webp
        sq = create_launcher_square(std_size)
        sq.save(os.path.join(dir_path, 'ic_launcher.webp'), format='WEBP')

        # ic_launcher_round.webp
        rd = create_launcher_round(std_size)
        rd.save(os.path.join(dir_path, 'ic_launcher_round.webp'), format='WEBP')

        # ic_launcher_foreground.webp
        fg = create_launcher_foreground(fg_size)
        fg.save(os.path.join(dir_path, 'ic_launcher_foreground.webp'), format='WEBP')

        print(f'Updated {folder} (std: {std_size}px, fg: {fg_size}px)')

    print('All Android app icons successfully generated with authentic Ilmchi logo!')

if __name__ == '__main__':
    generate_all()
