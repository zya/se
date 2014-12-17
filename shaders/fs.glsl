#extension GL_OES_standard_derivatives : enable

uniform vec3 uPointLightPos;

uniform vec3 uAmbientLightColor;
uniform vec3 uPointLightColor;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform float uShininess; //

uniform sampler2D tDiffuse;
uniform sampler2D tDisplacement;
uniform sampler2D tNormal;
uniform sampler2D tSpec;  //
uniform sampler2D tOcc; //

uniform float tDiffuseOpacity;

uniform float uNormalScale; //

varying vec3 vTangent;
varying vec3 vBinormal;
varying vec3 vNormal;
varying vec2 vUv;

varying vec3 vPointLightVector;
varying vec3 vViewPosition;

uniform float uDisplacementPostScale;
  
uniform sampler2D bumpMap;
uniform float bumpScale;

// Derivative maps - bump mapping unparametrized surfaces by Morten Mikkelsen
//	http://mmikkelsen3d.blogspot.sk/2011/07/derivative-maps.html

// Evaluate the derivative of the height w.r.t. screen-space using forward differencing (listing 2)

vec2 dHdxy_fwd() {
vec2 dSTdx = dFdx( vUv );
vec2 dSTdy = dFdy( vUv );

float hll = bumpScale * texture2D( tDisplacement, vUv ).x;
float dBx = bumpScale * texture2D( tDisplacement, vUv + dSTdx ).x - hll;
float dBy = bumpScale * texture2D( tDisplacement, vUv + dSTdy ).x - hll;

return vec2( dBx, dBy );

}

vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy ) {

vec3 vSigmaX = dFdx( surf_pos );
vec3 vSigmaY = dFdy( surf_pos );
vec3 vN = surf_norm;		// normalized

vec3 R1 = cross( vSigmaY, vN );
vec3 R2 = cross( vN, vSigmaX );

float fDet = dot( vSigmaX, R1 );

vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
return normalize( abs( fDet ) * surf_norm - vGrad );

}


void main() {

  vec4 diffuseTex     = texture2D( tDiffuse, vUv ) * tDiffuseOpacity;
  diffuseTex.a        = tDiffuseOpacity;
  // vec3 specTex        = texture2D( tSpec, vUv ).xyz;
  // vec3 occTex         = texture2D( tOcc, vUv ).xyz;
  vec3 normalTex      = texture2D( tNormal, vUv ).xyz * 2.0 - 1.0;
  
  mat3 tsb            = mat3( vTangent, vBinormal, vNormal );
  vec3 finalNormal    = tsb * normalTex.rgb;

  vec3 normal         = normalize( finalNormal );
  vec3 normal2         = normalize( finalNormal );
  
  vec3 viewPosition   = normalize( vViewPosition );

  normal = perturbNormalArb( -vViewPosition, normal * vec3(100.0/(uDisplacementPostScale+1.0)), dHdxy_fwd() );

  normal = normalize(normal);
  // point light

  vec4 pointDiffuse           = vec4( 0.0, 0.0, 0.0, 0.0 );
  vec4 pointSpecular          = vec4( 0.0, 0.0, 0.0, 0.0 ); //
  
  vec3 pointVector            = normalize( vPointLightVector );
  float dotProduct = dot( normal, pointVector );

  float pointDiffuseWeight = max( dotProduct, 0.0 );
  
  vec3 pointHalfVector        = normalize( vPointLightVector + viewPosition );

  // specular

  float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );
  float pointSpecularWeight   = 0.0;  //
  pointSpecularWeight += max( pow( pointDotNormalHalf, uShininess ), 0.0 );
  pointSpecular += vec4( uSpecularColor, 1.0 ) * vec4( uPointLightColor, 1.0 ) * pointSpecularWeight * pointDiffuseWeight;
      
  if ( pointDotNormalHalf >= 0.0 )    pointSpecularWeight = pow( pointDotNormalHalf, uShininess );  // no spectex
  pointDiffuse                  += vec4( uDiffuseColor, 1.0 ) * vec4( uPointLightColor, 1.0 ) * pointDiffuseWeight;

  // all lights contribution summation

  vec4 totalLight             = vec4( uAmbientLightColor * uAmbientColor , 1.0 ); // orig
  totalLight                 += vec4( uPointLightColor, 1.0 ) * ( pointDiffuse + pointSpecular );

  // with texture
  gl_FragColor = vec4( diffuseTex.xyz + totalLight.xyz, 1.0 );
  
  // without texture
  // gl_FragColor = vec4( totalLight.xyz, 1.0 );
                
}