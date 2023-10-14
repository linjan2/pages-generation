import {Editor, editors} from './editor';
import {initializeGraphics} from './graphics';

let content = document.getElementById("content");
content.setAttribute("v-scope", "");
content.setAttribute("v-on:vue:mounted", "mounted");

function app(state, vertexShader, fragmentShader) {
    return initializeGraphics(state, vertexShader, fragmentShader)
        .then(graphics => {
            graphics.pushCommands([
                {type : graphics.UPLOAD_VBO, data : graphics.vertices},
                {type : graphics.UPLOAD_IBO, data : graphics.indices},
                {type : graphics.UPLOAD_TEXTURE, data : graphics.textureImage},
                {
                    // set type [x,y]
                    type : graphics.SET_ATTRIBUTE,
                    location : graphics.positionLocation,
                    vertexSize : 2,
                    dataType : graphics.gl.FLOAT,
                    normalize : false,
                    stride : 0, // 0 means use natural packed stride
                    byteOffset : graphics.positions.byteOffset
                },
                {
                    // set type [s,t]
                    type : graphics.SET_ATTRIBUTE,
                    location : graphics.texelLocation,
                    vertexSize : 2,
                    dataType : graphics.gl.FLOAT,
                    normalize : false,
                    stride : 0, // 0 means use natural packed stride
                    byteOffset : graphics.texels.byteOffset
                },
                {
                    //
                    type : graphics.SET_UNIFORMS,
                    mouse : new Float32Array([ 0.0, 0.0 ]),
                    time : new Float32Array([ 0.0 ]),
                    color : new Float32Array([ 0.9, 0.9, 0.9, 1.0 ]),
                    rotate : new Float32Array([ 0.0 ]) // [Math.tan(Math.PI/8)]
                }
            ]);

            graphics.setPostCommands([ {
                type : graphics.DRAW_ELEMENTS,
                mode : graphics.gl.TRIANGLE_STRIP,
                indexCount : graphics.indicesBackground.length,
                byteOffset : graphics.indicesBackground.byteOffset
            } ]);

            graphics.setStarted();
            graphics.setStopped();
            return graphics;
        });
}

let state = PetiteVue.reactive({fps : 0, stopped : true});

PetiteVue
    .createApp({
        Editor,
        editors,
        graphics : null,
        state,
        mounted() {
            console.log("app mounted");
            app(this.state, this.editors[0].view.state.doc.toString(),
                this.editors[1].view.state.doc.toString())
                .then(graphics => { this.graphics = graphics; });
        },
        run() {
            this.graphics.pushCommands([
                {
                    type : this.graphics.SET_SHADER,
                    vertexShader : this.editors[0].view.state.doc.toString(),
                    fragmentShader : this.editors[1].view.state.doc.toString()
                },
                // { type: this.graphics.UPLOAD_VBO, data:
                // this.graphics.vertices }, { type: this.graphics.UPLOAD_IBO,
                // data: this.graphics.indices }, { type:
                // this.graphics.UPLOAD_TEXTURE, data:
                // this.graphics.textureImage }, { // set type [x,y]
                //   type: this.graphics.SET_ATTRIBUTE,
                //   location: this.graphics.positionLocation,
                //   vertexSize: 2,
                //   dataType: this.graphics.gl.FLOAT,
                //   normalize: false,
                //   stride: 0, // 0 means use natural packed stride
                //   byteOffset: this.graphics.positions.byteOffset
                // },
                // { // set type [s,t]
                //   type: this.graphics.SET_ATTRIBUTE,
                //   location: this.graphics.texelLocation,
                //   vertexSize: 2,
                //   dataType: this.graphics.gl.FLOAT,
                //   normalize: false,
                //   stride: 0, // 0 means use natural packed stride
                //   byteOffset: this.graphics.texels.byteOffset
                // },
                {
                    //
                    type : this.graphics.SET_UNIFORMS,
                    mouse : new Float32Array([ 0.0, 0.0 ]),
                    time : new Float32Array([ 0.0 ]),
                    color : new Float32Array([ 0.9, 0.9, 0.9, 1.0 ]),
                    rotate : new Float32Array([ 0.0 ]) // [Math.tan(Math.PI/8)]
                }
            ]);
        },
        toggle() { this.graphics.toggleStopped(); }
    })
    .mount(content);
