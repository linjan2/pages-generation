/* eslint no-unused-vars: "off" */
var initializeGraphics;
({
  initializeGraphics: initializeGraphics
} = (function (){
  "use strict";


function loadImages() {
  // run everything else when image is loaded
  // return (new Promise(resolve => textureImage.addEventListener("load",
  //   () => resolve(textureImage)))).then((textureImage) => {

    // });
  return Promise.all([
    new Promise(resolve => {
      const textureImage = new Image();
      textureImage.src = "glsl/image.jpg";
      textureImage.addEventListener("load", () => resolve(textureImage));
    })
  ]);
}

function createData() {
  // ---------------[ Data / Vertex grid ]
  // Vertex positions as a n*m grid
  let width = 16; // maintain aspect ratio 16:10 (or 10:16 in portrait orientation)
  let height = 10;
  let vertexCount = width*height;
  let positionLength = 2; // 2 floats per position
  let positionsCount = positionLength * vertexCount; // number of floats
  let texelLength = 2; // 2 floats per position
  let texelsCount = texelLength * vertexCount; // number of floats
  let vertices = new ArrayBuffer(
    positionsCount*Float32Array.BYTES_PER_ELEMENT + texelsCount*Float32Array.BYTES_PER_ELEMENT);

  // position is based on aspect width and height
  // let vertices = new Float32Array(buffer, 0, positionsCount);
  let positions = new Float32Array(vertices, 0, positionsCount);
  for (let i = 0; i < height; i += 1) {
    for (let j = 0; j < width; j += 1) {
      let index = (j+i*width)*positionLength;
      positions[index+0] = j; // x
      positions[index+1] = i; // y
      // set each vertex field [-1,1]
      // vertices[index+0] = (j / (width-1)) * 2 - 1;
      // vertices[index+1] = (i / (height-1)) * 2 - 1;
      // maybe scale to viewport aspect ratio instead and normalize in shader instead
    }
  }

  // ---------------[ Data / indices ]
  // IBO contains all element indices for every drawElements-call
  let indicesBackgroundCount = 2*width*(height-1) + 2*(height-2); // counter-clockwise triangle strip grid
  let indicesBackgroundBytes = indicesBackgroundCount * Uint16Array.BYTES_PER_ELEMENT;
  let indicesBannerCount = 4; // triangle fan rectangle
  let indicesBannerBytes = indicesBannerCount * Uint16Array.BYTES_PER_ELEMENT;
  let indices = new ArrayBuffer(indicesBackgroundBytes + indicesBannerBytes); // all IBO data
  let indicesBackground = new Uint16Array(
    indices,
    /*byteOffset*/0,
    indicesBackgroundCount);
  let indicesBanner = new Uint16Array(
    indices,
    /*byteOffset*/indicesBackgroundCount*indicesBackground.BYTES_PER_ELEMENT,
    indicesBannerCount);

  // ---------------[ Data / indices / grid indices ]
  {
    let index = 0;
    for (let i = 0; i < (height-2); i += 1) {
      for (let j=0; j < width; j+=1) {
        indicesBackground[index+0] = j+i*width;
        indicesBackground[index+1] = j+width+i*width;
        index += 2;
      }
      // at end of row, add degenerate triangles by double last and first of next row
      indicesBackground[index+0] = i*width+(width-1)+width;
      indicesBackground[index+1] = i*width+width;
      index += 2;
    }
    // second to last row has no degenerate vertices
    for (let j=0, i = height-2; j < width; j+=1) {
      indicesBackground[index+0] = j+i*width;
      indicesBackground[index+1] = j+width+i*width;
      index += 2;
    }
  }

  // ---------------[ Data / indices / bottom banner ]
  // Create a bottom banner that is two grid rows high and full width
  indicesBanner.set([
    0,                  // bottom left
    width*2,            // top left
    width*2 + width-1,  // top right
    width-1             // bottom right
  ]);

  // ---------------[ Data / texture ]
  let texels = new Float32Array(vertices, /*byteOffset*/positionsCount*positions.BYTES_PER_ELEMENT, /*size*/texelsCount);
  for (let i = 0; i < height; i += 1) {
    for (let j = 0; j < width; j += 1) {
      let index = (j+i*width)*texelLength;
      texels[index+0] = j/width;  // x
      texels[index+1] = i/height; // y
    }
  }

  return {
    vertices,
    positions,
    texels,
    indices,
    indicesBackground,
    indicesBanner,
    aspect: new Float32Array([1.0/(width-1), 1.0/(height-1)])
  };
}

function createContext() {
  const canvasElement = document.getElementById("canvas");
  const gl = canvasElement.getContext("webgl");
  if (!gl) {
    throw new Error("browser may not support webgl");
  }
  const container = document.getElementById("canvas-container");

  // const aspectRatio = gl.drawingBufferHeight / gl.drawingBufferWidth;
  // const aspectRatio2 = canvasElement.clientHeight / canvasElement.clientWidth;
  // console.log(aspectRatio, aspectRatio2);
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL); // near things obscure far things; if equal depth, the last one drawn wins.
    // TODO: change to gl.LESS and draw front to back
  // don't draw back-facing fragments (front is counter-clockwise winding)
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);
  gl.disable(gl.CULL_FACE); // TODO: keep enabled
  console.assert(gl.getError() === 0, "glGetError()");

  // resize surface when container resizes
  let surface = { width: container.clientWidth, height: container.clientHeight };
  // window.addEventListener("resize", (e) => {
  //   surface.width = container.clientWidth;
  //   surface.height = container.clientHeight;
  //   console.log("surface", surface.width, surface.height);
  //   console.log("gl.drawingBuffer", gl.drawingBufferWidth, gl.drawingBufferHeight);
  // });
  const resizeObserver = new ResizeObserver(entries => {
    const element = entries[0].target;
    surface.width = element.clientWidth;
    surface.height = element.clientHeight;
    console.log("Size changed", surface.width, surface.height);
  });
  resizeObserver.observe(container, {box: "content-box"});

  return {
    gl,
    canvasElement,
    surface,
    container
  };
}

function setupMouse(canvasElement) {
  let mouseX = 0;
  let mouseY = 0;
  canvasElement.addEventListener("mousedown", (e) => {
    console.log("mousedown", e.clientX - canvasElement.offsetLeft + window.scrollX, e.clientY - canvasElement.offsetTop + window.scrollY);
  }, false);
  canvasElement.addEventListener("mouseup", (e) => {
    console.log("mouseup", e.clientX - canvasElement.offsetLeft + window.scrollX, e.clientY - canvasElement.offsetTop + window.scrollY);
  }, false);
  canvasElement.addEventListener("mouseenter", (e) => {
    console.log("mouseenter", e);
  }, false);
  canvasElement.addEventListener("mouseleave", (e) => {
    console.log("mouseleave", e);
    // mouseX = 0;
    // mouseY = 0;
  }, false);

  canvasElement.addEventListener("mousemove", (e) => {
    // console.log("mousemove", e);
    mouseX = e.clientX - canvasElement.offsetLeft + window.scrollX;
    mouseY = e.clientY - canvasElement.offsetTop + window.scrollY;
  }, false);

  // click fires after both the mousedown and mouseup events have fired, in that order
  // e.detail is 2 for double click, 3 for triple click, and so on
  canvasElement.addEventListener("click", (e) => {
    if (e.detail > 1) {
      console.log("e.detail", e.detail);
    }
  }, false);

  return (function getMouse() {
    return {
      mouseX,
      mouseY
    };
  });
}

function createShader(gl, program, vertexShaderSource, fragmentShaderSource) {
  // const vertexShaderSource = `#version 100
  //   uniform float u_rotate;
  //   uniform vec4 u_color;
  //   uniform vec2 u_aspect;
  //   uniform vec2 u_mouse;
  //   uniform float u_time;

  //   attribute vec2 position;
  //   attribute vec2 texel;

  //   varying vec4 color;
  //   varying vec2 st;

  //   void main() {
  //     gl_PointSize = 5.0;

  //     vec2 p = position * u_aspect * 2.0 - 1.0; // aspect is inverted; x,y on [-1, 1]

  //     vec2 u = vec2(1.0, u_rotate);
  //     vec2 z = vec2(1.0-u_rotate*u_rotate, 2.0*u_rotate) / dot(u,u);
  //     // complex multiplication z*p (mat2 is column-major)
  //     // p = vec2(z.x*position.x - z.y*position.y, z.x*position.y + z.y*position.x);
  //     mat2 rot = mat2(z.x, z.y, -z.y, z.x);

  //     gl_Position = vec4(rot*p, -1.0, 1.0);

  //     color = u_color;
  //     st = vec2(texel.x, 1.0-texel.y); // s & t on [0,1]
  //   }`;
  // const fragmentShaderSource = `#version 100
  //   precision mediump float;
  //   uniform sampler2D u_sampler;
  //   uniform vec2 u_dimensions;
  //   varying vec4 color;
  //   varying vec2 st;

  //   void main() {
  //     // vec2 p = gl_FragCoord.xy * u_dimensions;
  //     // gl_FragColor = vec4(p, 1.0, 1.0);

  //     // gl_FragColor = color;
  //     gl_FragColor = texture2D(u_sampler, st);
  //   }`;

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vertexShader, vertexShaderSource);
  gl.shaderSource(fragmentShader, fragmentShaderSource);
  gl.compileShader(vertexShader);
  console.assert(gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS), gl.getShaderInfoLog(vertexShader));
  gl.compileShader(fragmentShader);
  console.assert(gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS), gl.getShaderInfoLog(fragmentShader));

  if (program !== null) {
    gl.useProgram(null);
    gl.deleteProgram(program);
  }
  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  console.assert(gl.getProgramParameter(program, gl.LINK_STATUS), gl.getProgramInfoLog(program));

  gl.detachShader(program, vertexShader);
  gl.detachShader(program, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  console.assert(gl.getError() === 0, "glGetError()");
  gl.useProgram(program);

  // returned location is null if variable doesn't exist (may have been removed if unused in shader)
  const colorLocation = gl.getUniformLocation(program, "u_color");
  console.assert(gl.getError() === 0, "glGetError()");
  if (colorLocation == null) { console.warn("u_color not found in shader"); }
  const rotateLocation = gl.getUniformLocation(program, "u_rotate");
  console.assert(gl.getError() === 0, "glGetError()");
  if (rotateLocation == null) { console.warn("u_rotate not found in shader"); }
  const aspectLocation = gl.getUniformLocation(program, "u_aspect");
  console.assert(gl.getError() === 0, "glGetError()");
  if (aspectLocation == null) { console.warn("u_aspect not found in shader"); }
  const mouseLocation = gl.getUniformLocation(program, "u_mouse");
  console.assert(gl.getError() === 0, "glGetError()");
  if (mouseLocation == null) { console.warn("u_mouse not found in shader"); }
  const timeLocation = gl.getUniformLocation(program, "u_time");
  console.assert(gl.getError() === 0, "glGetError()");
  if (timeLocation == null) { console.warn("u_time not found in shader"); }
  const dimensionsLocation = gl.getUniformLocation(program, "u_dimensions");
  console.assert(gl.getError() === 0, "glGetError()");
  if (dimensionsLocation == null) { console.warn("u_dimensions not found in shader"); }
  const positionLocation = gl.getAttribLocation(program, "position");
  console.assert(gl.getError() === 0, "glGetError()");
  if (positionLocation == null) { console.warn("position not found in shader"); }
  const texelLocation = gl.getAttribLocation(program, "texel");
  console.assert(gl.getError() === 0, "glGetError()");
  if (texelLocation == null) { console.warn("texel not found in shader"); }
  const samplerLocation = gl.getUniformLocation(program, "u_sampler");
  console.assert(gl.getError() === 0, "glGetError()");
  if (samplerLocation == null) { console.warn("u_sampler not found in shader"); }

  return {
    program,
    colorLocation,
    rotateLocation,
    aspectLocation,
    mouseLocation,
    timeLocation,
    dimensionsLocation,
    positionLocation,
    texelLocation,
    samplerLocation
  };
}


function createBuffers(gl, vertices, indices, positions, texels, textureImage, positionLocation, texelLocation) {
  const vbo = gl.createBuffer(); // the only VBO in use
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  // gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, null, 0, indices.length);

  // set vbo positions to match shader attributes
  gl.vertexAttribPointer(
    /*index*/positionLocation,
    /*size*/2,
    /*type*/gl.FLOAT,
    /*normalize*/false,
    /*stride (use vertex size)*/0,
    /*byteOffset*/positions.byteOffset);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(
    /*index*/texelLocation,
    /*size*/2,
    /*type*/gl.FLOAT,
    /*normalize*/false,
    /*stride (use vertex size)*/0,
    /*byteOffset*/ texels.byteOffset);
  gl.enableVertexAttribArray(texelLocation);

  // texture
  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // gl.LINEAR
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // gl.LINEAR

  // gl.texImage2D(gl.TEXTURE_2D, /*mip level*/ 0, /*internalFormat*/ gl.RGBA, /*width*/ 1, /*height*/ 1, /*border*/ 0, /*format*/ gl.RGBA, /*type*/ gl.UNSIGNED_BYTE, /*data*/ new Uint8Array([0, 0, 255, 255]));
  // gl.texImage2D(target, level, internalformat, width, height, border, format, type, offset)
  // gl.texImage2D(target, level, internalformat, width, height, border, format, type, source)
  // gl.texImage2D(target, level, internalformat, width, height, border, format, type, srcData, srcOffset)
  // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texImage2D(
    /*target*/gl.TEXTURE_2D,
    /*mip level*/0,
    /*internalFormat*/gl.RGB,
    /*format*/gl.RGB,
    /*byte*/gl.UNSIGNED_BYTE,
    /*image*/textureImage);

    // WebGL warning: generateMipmap: The base level of the texture does not have power-of-two dimensions
  // gl.generateMipmap(gl.TEXTURE_2D);
}

function initializeGraphics(state, vertexShaderSource, fragmentShaderSource) {

  return loadImages().then(images => {
    const textureImage = images[0];

    const {
      vertices,
      positions,
      texels,
      indices,
      indicesBackground,
      indicesBanner,
      aspect
    } = createData();

    const {
      gl,
      canvasElement,
      surface,
      container
    } = createContext();

    const getMouse = setupMouse(canvasElement);

    const {
      program,
      colorLocation,
      rotateLocation,
      aspectLocation,
      mouseLocation,
      timeLocation,
      dimensionsLocation,
      positionLocation,
      texelLocation,
      samplerLocation
    } = createShader(gl, null, vertexShaderSource, fragmentShaderSource);

    createBuffers(gl, vertices, indices, positions, texels, textureImage, positionLocation, texelLocation);

    if (samplerLocation !== null)    gl.uniform1i( samplerLocation, 0); // only uses texture 0
    if (aspectLocation !== null)     gl.uniform2fv(aspectLocation, new Float32Array(aspect));
    if (dimensionsLocation !== null) gl.uniform2fv(dimensionsLocation, new Float32Array([1.0/gl.drawingBufferWidth, 1.0/gl.drawingBufferHeight]));
    if (rotateLocation !== null)     gl.uniform1fv(rotateLocation, new Float32Array([0.0]));
    if (colorLocation !== null)      gl.uniform4fv(colorLocation, new Float32Array([1.0, 0.0, 0.0, 1.0]));
    if (mouseLocation !== null)      gl.uniform2fv(mouseLocation, new Float32Array(getMouse()));
    if (timeLocation !== null)       gl.uniform1fv(timeLocation, new Float32Array([0.0]));

    // ---------------[ Commands ]

    // command types
    const UPLOAD_VBO = 0;
    const UPLOAD_IBO = 1;
    const UPLOAD_TEXTURE = 2;
    const SET_ATTRIBUTE = 3;
    const DISABLE_ATTRIBUTES = 4;
    const SET_UNIFORMS = 5;
    const DRAW_ARRAYS = 6;
    const DRAW_ELEMENTS = 7;
    const SET_SHADER = 8;

    // ---------------[ Render loop ]
    let commands = [];
    let postCommands = [];
    // let stopped = true;
    let then = 0;
    let acc = 0;
    let frames = 0;
    // let fps = 0;
    let acc32ms = 0;

    let graphics;

    function render(now) {
      // now *= 0.001; // convert to seconds
      const deltaTime = now - then;
      then = now;
      acc += deltaTime;
      acc32ms += deltaTime;
      if (32 < acc32ms) {
        // slow down render for now to ~32 ms
        acc32ms = 0; // acc32ms -= 32;

        frames += 1;
        if (1000 < acc) {
          // calculate fps over the last ~second
          let fps = frames;
          acc = 0;
          frames = 0;
          // console.log("fps", fps);
          state.fps = fps;
        }

        commands.splice(0, 0, ...postCommands); // insert at beginning

        // check if window has been resized
        // console.log(gl.drawingBufferWidth, gl.drawingBufferHeight, "=>", surface);
        if (surface.width !== gl.drawingBufferWidth || surface.width !== gl.drawingBufferHeight ) {
          canvasElement.width = surface.width; // canvasElement.style.width ?
          canvasElement.height = surface.height; // canvasElement.style.height ?
          gl.viewport(0, 0, surface.width, surface.height);
          gl.uniform2fv(dimensionsLocation, new Float32Array([1.0/gl.drawingBufferWidth, 1.0/gl.drawingBufferHeight]));
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        for (let i = 0; i < commands.length; i += 1) {
          let command = commands[i];
          switch (command.type) {

            case UPLOAD_VBO: { // update VBO buffer
              gl.bufferData(gl.ARRAY_BUFFER, command.data, gl.STATIC_DRAW);
            } break;

            case UPLOAD_IBO: { // update IBO buffer
              gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, command.data, gl.STATIC_DRAW);
            } break;

            case UPLOAD_TEXTURE: { // update texture (TEXTURE0)
              gl.texImage2D(
                /*target*/gl.TEXTURE_2D,
                /*mip level*/0,
                /*internalFormat*/gl.RGB,
                /*format*/gl.RGB,
                /*byte*/gl.UNSIGNED_BYTE,
                /*image*/command.data);
            } break;

            case SET_ATTRIBUTE: { // set current buffer's attribute interpretation
              gl.vertexAttribPointer(
                /*index*/command.location,
                /*size*/command.vertexSize,
                /*type*/command.dataType,
                /*normalize*/command.normalize,
                /*stride (use vertex size)*/command.stride,
                /*byteOffset*/command.byteOffset);
                gl.enableVertexAttribArray(command.location);
            } break;

            case SET_UNIFORMS: { // set uniforms (always the first command?)
              // // gl.uniform1i(command.samplerLoc, command.sampler); // uniform sampler2D sampler; texture2D(sampler, st)
              // // gl.uniform1iv(command.stLoc, command.st); // array of 1D integers, for sampler coordinates
              // gl.uniform1f(command.flipYLocation, -1);  // need to y flip for canvas
              // gl.uniform1fv(command.timeLocation, command.time); // [0,1] mapped from 1 second?
              // // gl.uniform1fv(command.floatsLocation, [0.045, 0.122, 0.045, 0.122]);
              // gl.uniform2fv(command.lightLocation, command.light); // [-1.75, 0.7, 1.0]
              // gl.uniform4fv(command.quaternionLocation, command.quaternion); // quaternion [a,b,c,d]
              // gl.uniform3fv(command.lightLocation, command.light); // [-1.75, 0.7, 1.0]
              // gl.uniformMatrix4fv(command.mvpLocation, /*transpose*/false, command.mvp);

              // gl.uniform2fv(aspectLocation, command.aspect); // invert the aspect for multiplication in vertex shader
              // gl.uniform2fv(dimensionsLocation, command.dimensions); // invert the dimensions for multiplication in vertex shader
              // gl.uniform2fv(mouseLocation, command.mouse);


              // unused variables may be removed from shader
              // gl.uniform1fv(timeLocation, command.time);
              // gl.uniform4fv(colorLocation, command.color);
              // gl.uniform1fv(rotateLocation, command.rotate);
            } break;

            case DRAW_ARRAYS: { // draw with vertices
              // gl.POINTS, gl.LINE_STRIP, gl.LINE_LOOP, gl.LINES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN, and gl.TRIANGLES
              gl.drawArrays(command.mode, /*first*/command.offset, command.vertexCount);
            } break;

            case DRAW_ELEMENTS: { // draw with indices
              gl.drawElements(
                command.mode,
                /*count*/command.indexCount,
                /*type*/gl.UNSIGNED_SHORT,
                /*offset*/command.byteOffset);
            } break;

            case SET_SHADER: {
              ({
                program: graphics.program,
                colorLocation: graphics.colorLocation,
                rotateLocation: graphics.rotateLocation,
                aspectLocation: graphics.aspectLocation,
                mouseLocation: graphics.mouseLocation,
                timeLocation: graphics.timeLocation,
                dimensionsLocation: graphics.dimensionsLocation,
                positionLocation: graphics.positionLocation,
                texelLocation: graphics.texelLocation,
                samplerLocation: graphics.samplerLocation
              } = createShader(graphics.gl, graphics.program, command.vertexShader, command.fragmentShader));

              // reset all uniforms
              if (graphics.samplerLocation !== null)    gl.uniform1i( graphics.samplerLocation, 0); // only uses texture 0
              if (graphics.aspectLocation !== null)     gl.uniform2fv(graphics.aspectLocation, new Float32Array(aspect));
              if (graphics.dimensionsLocation !== null) gl.uniform2fv(graphics.dimensionsLocation, new Float32Array([1.0/graphics.gl.drawingBufferWidth, 1.0/graphics.gl.drawingBufferHeight]));
              if (graphics.rotateLocation !== null)     gl.uniform1fv(graphics.rotateLocation, new Float32Array([0.0]));
              if (graphics.colorLocation !== null)      gl.uniform4fv(graphics.colorLocation, new Float32Array([1.0, 0.0, 0.0, 1.0]));
              if (graphics.mouseLocation !== null)      gl.uniform2fv(graphics.mouseLocation, new Float32Array(getMouse()));
              if (graphics.timeLocation !== null)       gl.uniform1fv(graphics.timeLocation, new Float32Array([0.0]));
            } break;

            default: {
              console.error(command);
              throw new Error("unknown command type: " + command.type);
            }
          }
        }
        commands.splice(0, commands.length); // clear
      }

      if (!state.stopped) {
        requestAnimationFrame(render);
      } else {
        console.log("Stopping rendering");
      }
    }

    // requestAnimationFrame(render);
    graphics = {
      state,
      gl,
      program,
      render,
      surface,
      UPLOAD_VBO,
      UPLOAD_IBO,
      UPLOAD_TEXTURE,
      SET_ATTRIBUTE,
      DISABLE_ATTRIBUTES,
      SET_UNIFORMS,
      DRAW_ARRAYS,
      DRAW_ELEMENTS,
      SET_SHADER,
      vertices,
      positions,
      texels,
      indices,
      indicesBackground,
      indicesBanner,
      textureImage,
      colorLocation,
      rotateLocation,
      aspectLocation,
      mouseLocation,
      timeLocation,
      dimensionsLocation,
      positionLocation,
      texelLocation,
      samplerLocation,
      setStarted() {
        if (this.state.stopped) {
          requestAnimationFrame(render);
        }
        this.state.stopped = false;
      },
      setStopped() {
        this.state.stopped = true;
      },
      toggleStopped() {
        if (this.state.stopped) {
          console.log("Starting rendering");
          console.log("surface.width", surface.width);
          console.log("surface.height", surface.height);
          console.log("gl.drawingBufferWidth", gl.drawingBufferWidth);
          console.log("gl.drawingBufferHeight", gl.drawingBufferHeight);
          requestAnimationFrame(render);
        }
        this.state.stopped = !state.stopped;
      },
      pushCommands(commandArray) {
        commands.splice(commands.length, 0, ...commandArray); // append
      },
      setPostCommands(commandArray) {
        postCommands.splice(0, postCommands.length, ...commandArray); // replace
      }
    };
    return graphics;
  });
}

return {
  initializeGraphics
};
})());


export {
  initializeGraphics
};

