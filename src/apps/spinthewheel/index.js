let items =
    [
        {text : "Melon 🍉"}, {text : "Teddy bear 🧸"}, {text : "Flower 🌸"},
        {text : "Rainbow 🌈"}, {text : "Money bag 💰"}
    ]

    let hue0 = Math.floor(Math.random() * 360);

function recalculate(items) {
    let N = items.length;
    let hue = hue0;

    // use half-rotation to align sector middle to axis (and to allow odd number
    // of sectors)
    let wyhalf = -Math.tan(
        Math.PI / (N * 2)); // negative y since SVG y increases downwards (still
                            // rotates counter-clockwise)
    let zxhalf = (1.0 - wyhalf * wyhalf) / (1.0 + wyhalf * wyhalf);
    let zyhalf = (2.0 * wyhalf) / (1.0 + wyhalf * wyhalf);

    let zx = zxhalf * zxhalf - zyhalf * zyhalf;
    let zy = zxhalf * zyhalf * 2;

    let x = zx;
    let y = zy;

    let rotations = new Array(N + 1); // real Z rotations + the zero-rotation
    rotations[0] = {x : 1.0, y : 0.0};
    rotations[1] = {x, y};

    let x2 = zxhalf;
    let y2 = zyhalf;
    items[0].x = x2;
    items[0].y = y2;
    items[0].c = `hsl(${hue}, 70%, 45%)`;

    for (let i = 1; i < N; i += 1) {
        x2 = zx * x - zy * y;
        y2 = zy * x + y * zx;
        x = x2;
        y = y2;
        // move back by half to align to axis
        x2 = zxhalf * x - (-zyhalf) * y;
        y2 = (-zyhalf) * x + zxhalf * y;

        items[i].x = x2;
        items[i].y = y2;
        hue = (hue + 137) % 360;
        items[i].c = `hsl(${hue}, 70%, 45%)`;
        rotations[i + 1] = {x, y};
    }
    return {
        z : {x : zx, y : zy},
        zhalf : {x : zxhalf, y : zyhalf},
        wyhalf : wyhalf,
        rotations : rotations
    };
}

let {z, zhalf, wyhalf, rotations} = recalculate(items);

PetiteVue
    .createApp({
        z : z,
        R : rotations,
        zhalf : zhalf,
        wyhalf : wyhalf,
        Zs : {x : 1.0, y : 0.0}, // rotation to selected
        items : items,
        items2 : [],
        input : "",
        playing : false,
        selected : 0,
        background : items[0].c,
        add(text) {
            if (text !== "") {
                this.input = "";
                this.Zs = {x : 1.0, y : 0.0};
                this.selected = 0;
                this.items.push({text});
                ({
                    z : this.Z,
                    zhalf : this.zhalf,
                    wyhalf : this.wyhalf,
                    rotations : this.R
                } = recalculate(this.items));
            }
        },
        remove(i) {
            this.items.splice(i, 1);
            this.Zs = {x : 1.0, y : 0.0};
            this.selected = 0;
            if (this.items.length <= 1) {
                this.Z = [ {x : 1, y : 0} ];
                zhalf = {x : 1, y : 0};
                this.wyhalf = 0;
                rotations = [ {x : 1.0, y : 0.0} ];
            } else {
                ({
                    z : this.Z,
                    zhalf : this.zhalf,
                    wyhalf : this.wyhalf,
                    rotations : this.R
                } = recalculate(this.items));
            }
        },
        playButton() {
            if (!this.playing) {
                let selected = Math.floor(Math.random() * this.items.length);

                let x = this.R[selected].x;
                let y = -this.R[selected].y;
                // add random offset within sector
                let yo = (Math.random() * 2 - 1) *
                         (this.wyhalf * 0.95); // (-wyhalf, +wyhalf)
                let zxo = (1.0 - yo * yo) / (1.0 + yo * yo);
                let zyo = (2.0 * yo) / (1.0 + yo * yo);

                this.Zs.x = zxo * x - zyo * y;
                this.Zs.y = zyo * x + zxo * y;
                this.selected = selected;
                this.playing = true;
            }
        },
        animationend() {
            this.playing = false;
            this.items2.unshift(this.items[this.selected].text);
        },
        fontsize(text) {
            let weight = text.length + (this.items.length - 5) * 0.5;
            let size = Math.ceil(200 - 200 * (1 - 8 / (weight + 7)));
            return size.toString();
        }
    })
    .mount("#app");
