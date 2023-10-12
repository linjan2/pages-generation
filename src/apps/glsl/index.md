<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"GLSL"
--metadata=title-meta="glsl"
--metadata=subtitle:"Testing GLSL in WebGL"
--metadata=description:'GLSL'
--include-in-header editor/head.html
--include-after-body editor/after.html
--->

# GLSL

```{=html}
<div class="debug">
  <div>FPS: {{ state.fps }}</div>
  <div>Stopped: {{ state.stopped }}</div>
</div>
```

```{=html}
<div id="canvas-container">
  <canvas id="canvas" width="960" height="540">
    Browser doesn't support HTML5 canvas.
  </canvas>
</div>
<div>
  <div class="flex flex-row">
    <button @click="run">Run</button>
    <button @click="toggle">Start/Stop</button>
  </div>
</div>
```

Vertex shader:

```{=html}
<pre class="editor" data-lang="cpp">
#version 100
uniform float u_rotate;
uniform vec4 u_color;
uniform vec2 u_aspect;
uniform vec2 u_mouse;
uniform float u_time;

attribute vec2 position;
attribute vec2 texel;

varying vec4 color;
varying vec2 st;
//varying float time;

void main() {
  gl_PointSize = 5.0;

  vec2 p = position * u_aspect * 2.0 - 1.0; // aspect is inverted; x,y on [-1, 1]

  vec2 u = vec2(1.0, u_rotate);
  vec2 z = vec2(1.0-u_rotate*u_rotate, 2.0*u_rotate) / dot(u,u);
  // complex multiplication z*p (mat2 is column-major)
  // p = vec2(z.x*position.x - z.y*position.y, z.x*position.y + z.y*position.x);
  mat2 rot = mat2(z.x, z.y, -z.y, z.x);

  gl_Position = vec4(rot*p, -1.0, 1.0);

  color = u_color;
  st = vec2(texel.x, 1.0-texel.y); // s & t on [0,1]
  //time = u_time;
}
</pre>
```

Fragment shader:

```{=html}
<pre class="editor" data-lang="cpp">
#version 100
precision mediump float;
uniform sampler2D u_sampler;
uniform vec2 u_dimensions;
varying vec4 color;
varying vec2 st;
// varying vec2 time;

void main() {
  // vec2 p = gl_FragCoord.xy * u_dimensions;
  // gl_FragColor = vec4(p, 1.0, 1.0);

  // gl_FragColor = color;
  gl_FragColor = texture2D(u_sampler, st);
}
</pre>
```

## `GL_POINTS`

Show the coordinates in clip space

## Degenerate (no-area) triangles



