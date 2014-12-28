precision highp sampler2D;

attribute vec4 tangent;
attribute float amplitude;
attribute float displacement;

varying vec3 vTangent;
varying vec3 vBinormal;
varying vec3 vNormal;
varying vec2 vUv;

varying vec3 vPointLightVector;
varying vec3 vViewPosition;

uniform vec3 uPointLightPos;

#ifdef VERTEX_TEXTURES

uniform sampler2D tDisplacement;
uniform float uDisplacementScale;
uniform float uDisplacementBias;
uniform float uDisplacementPostScale;

#endif

void main() {

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  vViewPosition = -mvPosition.xyz; // ah HA

  vNormal = normalize( normalMatrix * normal );

  //tangent and binormal vectors
  vTangent = normalize( normalMatrix * tangent.xyz );

  vBinormal = cross( vNormal, vTangent ) * tangent.w;
  vBinormal = normalize( vBinormal );

  vUv = uv;

  // point light
  vec4 lPosition      = viewMatrix * vec4( uPointLightPos, 1.0 );
  vPointLightVector   = normalize( lPosition.xyz - mvPosition.xyz );

  #ifdef VERTEX_TEXTURES
      vec3 dv                 = texture2D( tDisplacement, vUv ).xyz;
      float df                = uDisplacementScale * dv.x + uDisplacementBias;
      
      vec4 displacedPosition  = vec4( vNormal.xyz * df * uDisplacementPostScale/100.0, 0.0 ) + mvPosition;

      gl_Position             = projectionMatrix * displacedPosition;
  #else
    gl_Position = projectionMatrix * mvPosition;
  #endif
}