import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

COLOR = (0, 174, 239, 255)
CLEAR = (0, 0, 0, 0)
SIZE, SCALE = 128, 4
CANVAS = SIZE * SCALE
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "assets" / "emojis"


def s(value): return round(value * SCALE)
def box(values): return tuple(s(value) for value in values)
def points(values): return [(s(x), s(y)) for x, y in values]


def rounded_line(draw, values, width=10, close=False):
    pts = points(values)
    if close: pts.append(pts[0])
    stroke = s(width)
    draw.line(pts, fill=COLOR, width=stroke, joint="curve")
    radius = stroke // 2
    targets = pts if close else [pts[0], pts[-1]]
    for x, y in targets:
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=COLOR)


def font(size):
    for name in ("arialbd.ttf", "Arial Bold.ttf", "arial.ttf"):
        try: return ImageFont.truetype(name, s(size))
        except OSError: pass
    return ImageFont.load_default()


def centered_text(draw, text, size, y=18):
    face = font(size)
    bounds = draw.textbbox((0, 0), text, font=face)
    width = bounds[2] - bounds[0]
    draw.text(((CANVAS-width)/2, s(y)), text, font=face, fill=COLOR)


def like(draw):
    draw.rounded_rectangle(box((38, 43, 108, 101)), radius=s(12), fill=COLOR)
    draw.rounded_rectangle(box((15, 52, 34, 104)), radius=s(6), fill=COLOR)
    draw.polygon(points([(42, 50), (57, 18), (72, 18), (69, 45), (97, 45), (97, 64), (43, 64)]), fill=COLOR)


def dislike(draw):
    draw.rounded_rectangle(box((38, 27, 108, 85)), radius=s(12), fill=COLOR)
    draw.rounded_rectangle(box((15, 24, 34, 76)), radius=s(6), fill=COLOR)
    draw.polygon(points([(42, 78), (57, 110), (72, 110), (69, 83), (97, 83), (97, 64), (43, 64)]), fill=COLOR)


def flag(draw):
    rounded_line(draw, [(25, 17), (25, 112)], 9)
    draw.polygon(points([(30, 20), (105, 20), (91, 49), (105, 76), (30, 76)]), fill=COLOR)


def bitcoin(draw):
    centered_text(draw, "B", 78, 12)
    rounded_line(draw, [(55, 12), (55, 116)], 5)
    rounded_line(draw, [(73, 12), (73, 116)], 5)


def diamond(draw):
    rounded_line(draw, [(64, 13), (108, 43), (64, 115), (20, 43)], 8, True)
    rounded_line(draw, [(20, 43), (108, 43)], 6)
    rounded_line(draw, [(43, 18), (51, 43), (64, 112)], 5)
    rounded_line(draw, [(85, 18), (77, 43), (64, 112)], 5)


def bell(draw):
    draw.ellipse(box((48, 103, 80, 118)), fill=COLOR)
    draw.polygon(points([(25, 95), (35, 82), (39, 46), (51, 28), (77, 28), (89, 46), (93, 82), (103, 95)]), fill=COLOR)
    draw.ellipse(box((55, 17, 73, 35)), fill=COLOR)


def ethereum(draw):
    draw.polygon(points([(64, 9), (102, 65), (64, 84), (26, 65)]), fill=COLOR)
    draw.polygon(points([(64, 91), (102, 71), (64, 119), (26, 71)]), fill=COLOR)


def euro(draw): centered_text(draw, "EUR", 42, 35)


def folder(draw):
    draw.rounded_rectangle(box((13, 39, 115, 105)), radius=s(9), fill=COLOR)
    draw.polygon(points([(17, 29), (55, 29), (67, 45), (109, 45), (109, 60), (17, 60)]), fill=COLOR)


def star(draw):
    values=[]
    for index in range(10):
        angle=-math.pi/2 + index*math.pi/5
        radius=52 if index%2==0 else 23
        values.append((64+math.cos(angle)*radius, 64+math.sin(angle)*radius))
    draw.polygon(points(values), fill=COLOR)


def sparkle(draw):
    draw.polygon(points([(48, 8),(57,48),(96,57),(57,66),(48,106),(39,66),(0,57),(39,48)]), fill=COLOR)
    draw.polygon(points([(98, 12),(103,31),(122,36),(103,41),(98,60),(93,41),(74,36),(93,31)]), fill=COLOR)


def hashtag(draw):
    rounded_line(draw, [(45, 17), (35, 111)], 10)
    rounded_line(draw, [(86, 17), (76, 111)], 10)
    rounded_line(draw, [(20, 47), (105, 47)], 10)
    rounded_line(draw, [(16, 82), (101, 82)], 10)


def info(draw):
    draw.ellipse(box((13, 13, 115, 115)), outline=COLOR, width=s(10))
    draw.ellipse(box((58, 29, 70, 41)), fill=COLOR)
    draw.rounded_rectangle(box((57, 51, 71, 96)), radius=s(6), fill=COLOR)


def calendar(draw):
    draw.rounded_rectangle(box((15, 24, 113, 111)), radius=s(11), outline=COLOR, width=s(9))
    draw.rounded_rectangle(box((16, 37, 112, 57)), radius=s(3), fill=COLOR)
    rounded_line(draw, [(39, 14), (39, 34)], 8); rounded_line(draw, [(89, 14), (89, 34)], 8)
    for y in (70, 90):
        for x in (35, 64, 93): draw.ellipse(box((x-5, y-5, x+5, y+5)), fill=COLOR)


def calculator(draw):
    draw.rounded_rectangle(box((24, 11, 104, 117)), radius=s(10), outline=COLOR, width=s(9))
    draw.rounded_rectangle(box((38, 25, 90, 48)), radius=s(4), fill=COLOR)
    for y in (67, 91):
        for x in (44, 64, 84): draw.ellipse(box((x-6, y-6, x+6, y+6)), fill=COLOR)


def card(draw):
    draw.rounded_rectangle(box((11, 29, 117, 100)), radius=s(11), outline=COLOR, width=s(9))
    draw.rectangle(box((13, 47, 115, 62)), fill=COLOR)
    draw.rounded_rectangle(box((27, 73, 51, 88)), radius=s(3), fill=COLOR)


def document(draw):
    rounded_line(draw, [(29, 10), (78, 10), (103, 35), (103, 117), (29, 117)], 9, True)
    rounded_line(draw, [(77, 12), (77, 38), (101, 38)], 7)
    for y, width in ((57, 28), (76, 47), (95, 39)): rounded_line(draw, [(45, y), (45+width, y)], 7)


def lock(draw):
    draw.rounded_rectangle(box((24, 53, 104, 113)), radius=s(10), fill=COLOR)
    draw.arc(box((38, 13, 90, 76)), 180, 360, fill=COLOR, width=s(11))
    draw.ellipse(box((57, 73, 71, 87)), fill=CLEAR); draw.rectangle(box((61, 84, 67, 99)), fill=CLEAR)


def unlock(draw):
    draw.rounded_rectangle(box((24, 53, 104, 113)), radius=s(10), fill=COLOR)
    draw.arc(box((47, 13, 99, 76)), 180, 345, fill=COLOR, width=s(11))
    draw.ellipse(box((57, 73, 71, 87)), fill=CLEAR); draw.rectangle(box((61, 84, 67, 99)), fill=CLEAR)


def key(draw):
    draw.ellipse(box((14, 14, 72, 72)), outline=COLOR, width=s(11))
    rounded_line(draw, [(59, 59), (111, 111)], 12)
    rounded_line(draw, [(84, 84), (98, 70)], 9); rounded_line(draw, [(99, 99), (113, 85)], 9)


def party(draw):
    draw.polygon(points([(18, 112), (39, 46), (88, 95)]), fill=COLOR)
    for x,y in ((56,22),(89,18),(104,48),(73,49)):
        draw.ellipse(box((x-5,y-5,x+5,y+5)), fill=COLOR)
    rounded_line(draw, [(42, 20), (50, 34)], 6); rounded_line(draw, [(105, 72), (116, 80)], 6)


def basket(draw):
    draw.polygon(points([(18, 49), (110, 49), (98, 108), (30, 108)]), fill=COLOR)
    rounded_line(draw, [(41, 52), (53, 25)], 8); rounded_line(draw, [(87, 52), (75, 25)], 8)
    for x in (45,64,83): draw.rounded_rectangle(box((x-4,64,x+4,94)), radius=s(3), fill=CLEAR)


def pencil(draw):
    rounded_line(draw, [(25, 102), (94, 33)], 18)
    draw.polygon(points([(15,113),(22,87),(41,106)]), fill=COLOR)
    rounded_line(draw, [(91, 29), (101, 19), (112, 30), (102, 40)], 14)


def coins(draw):
    for x,y in ((46,42),(82,37),(64,72),(91,88)):
        draw.ellipse(box((x-22,y-22,x+22,y+22)), outline=COLOR, width=s(8))
        draw.ellipse(box((x-5,y-5,x+5,y+5)), fill=COLOR)


def litecoin(draw): centered_text(draw, "L", 80, 10); rounded_line(draw, [(35, 74), (83, 53)], 8)
def pln(draw): centered_text(draw, "PLN", 39, 38)
def paypal(draw): centered_text(draw, "P", 84, 8); rounded_line(draw, [(54, 22), (39, 111)], 8)


def pin(draw):
    draw.ellipse(box((42, 13, 86, 57)), fill=COLOR)
    draw.rounded_rectangle(box((57, 44, 71, 91)), radius=s(6), fill=COLOR)
    draw.polygon(points([(43,85),(85,85),(64,117)]), fill=COLOR)


def wallet(draw):
    draw.rounded_rectangle(box((13, 29, 115, 105)), radius=s(12), fill=COLOR)
    draw.rounded_rectangle(box((65, 51, 119, 84)), radius=s(8), fill=CLEAR)
    draw.ellipse(box((91,61,103,73)), fill=COLOR)


def bag(draw):
    draw.rounded_rectangle(box((22, 43, 106, 113)), radius=s(11), fill=COLOR)
    draw.arc(box((42, 12, 86, 68)), 180, 360, fill=COLOR, width=s(9))


def rocket(draw):
    draw.polygon(points([(25,91),(47,45),(89,13),(115,13),(115,39),(83,81),(37,103)]), fill=COLOR)
    draw.ellipse(box((79,28,98,47)), fill=CLEAR)
    draw.polygon(points([(29,78),(13,83),(13,111),(47,96)]), fill=COLOR)
    draw.polygon(points([(50,100),(45,117),(73,117),(66,94)]), fill=COLOR)


def heart(draw):
    draw.ellipse(box((15,24,70,79)), fill=COLOR); draw.ellipse(box((58,24,113,79)), fill=COLOR)
    draw.polygon(points([(17,54),(111,54),(64,116)]), fill=COLOR)


def users(draw):
    for x,y,r in ((64,31,18),(31,47,14),(97,47,14)): draw.ellipse(box((x-r,y-r,x+r,y+r)), fill=COLOR)
    draw.rounded_rectangle(box((37,62,91,111)), radius=s(22), fill=COLOR)
    draw.rounded_rectangle(box((8,70,42,107)), radius=s(16), fill=COLOR)
    draw.rounded_rectangle(box((86,70,120,107)), radius=s(16), fill=COLOR)


EXTRA_ICONS = {
    "sqezz_like": like, "sqezz_flag": flag, "sqezz_bitcoin": bitcoin, "sqezz_diamond": diamond,
    "sqezz_dislike": dislike, "sqezz_bell": bell, "sqezz_ethereum": ethereum, "sqezz_euro": euro,
    "sqezz_folder": folder, "sqezz_star": star, "sqezz_sparkle": sparkle, "sqezz_hashtag": hashtag,
    "sqezz_info": info, "sqezz_calendar": calendar, "sqezz_calculator": calculator, "sqezz_card": card,
    "sqezz_document": document, "sqezz_lock": lock, "sqezz_unlock": unlock, "sqezz_key": key,
    "sqezz_party": party, "sqezz_basket": basket, "sqezz_pencil": pencil, "sqezz_coins": coins,
    "sqezz_litecoin": litecoin, "sqezz_pin": pin, "sqezz_pln": pln, "sqezz_wallet": wallet,
    "sqezz_bag": bag, "sqezz_rocket": rocket, "sqezz_heart": heart, "sqezz_users": users,
    "sqezz_paypal": paypal,
}


def render(renderer):
    image=Image.new("RGBA",(CANVAS,CANVAS),(0,0,0,0)); renderer(ImageDraw.Draw(image))
    return image.resize((SIZE,SIZE),Image.Resampling.LANCZOS)


def main():
    OUTPUT_DIR.mkdir(parents=True,exist_ok=True); rendered=[]
    for name,renderer in EXTRA_ICONS.items():
        image=render(renderer); image.save(OUTPUT_DIR/f"{name}.png",optimize=True); rendered.append((name,image))
    columns,cell_w,cell_h=5,175,170; rows=(len(rendered)+columns-1)//columns
    preview=Image.new("RGBA",(columns*cell_w,rows*cell_h),(9,11,18,255)); draw=ImageDraw.Draw(preview)
    try: label_font=ImageFont.truetype("arial.ttf",13)
    except OSError: label_font=ImageFont.load_default()
    for index,(name,image) in enumerate(rendered):
        col,row=index%columns,index//columns; x,y=col*cell_w,row*cell_h
        preview.alpha_composite(image,(x+23,y+8)); bounds=draw.textbbox((0,0),name,font=label_font)
        draw.text((x+(cell_w-(bounds[2]-bounds[0]))/2,y+142),name,font=label_font,fill=(219,234,254,255))
    preview.save(OUTPUT_DIR/"sqezz-extra-emoji-pack-preview.png",optimize=True)
    print(f"Generated {len(rendered)} extra emojis")


if __name__ == "__main__": main()
