var renderer, scene, camera, controls;
var mesh, geometry, material, texture;
var ambient = 0x000000, 
	diffuse = 0x000000, 
	specular = 0x000000, 
	shininess = 0.0, 
	scale = 50;
var uniforms;
var vs, fs;

function setup() {
	renderer = new THREE.WebGLRenderer({
		antialias: true
	});
	renderer.setClearColor(new THREE.Color('black'), 1);
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);
	
	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
	camera.position.z = 400;

	controls = new THREE.OrbitControls(camera);
	controls.minDistance = 200;
	controls.maxDistance = 500;
	controls.noKeys = true;
	controls.maxPolarAngle = 1.8;
	controls.minPolarAngle = 1.2;
	controls.noPan = true;
	controls.autoRotate = true;
	controls.autoRotateSpeed = 0.2;
	controls.zoomSpeed = 0.2;

	geometry = new THREE.PlaneBufferGeometry(200,200,70,70);
	geometry.computeTangents();

	var manager = new THREE.LoadingManager();
	var loader = new THREE.XHRLoader(manager);

	loader.load('shaders/vs.glsl', function(e){
		vs = e;
	});

	loader.load('shaders/fs.glsl', function(e){
		fs = e;
	});

	texture = new THREE.ImageUtils.loadTexture('images/1.png');

	var shader = THREE.ShaderLib.normalmap;
	uniforms = THREE.UniformsUtils.clone(shader.uniforms);
	uniforms[ "enableDisplacement" ].value = true;
  uniforms[ "enableDiffuse" ].value = 0;
  uniforms[ "tDiffuse" ].value = texture;
  uniforms[ "tDiffuseOpacity" ] = { type: 'f', value: 1.0 };
  uniforms[ "tDisplacement" ] = { type: 't', value: texture};
  uniforms[ "uDisplacementScale" ].value = 100;
  uniforms[ "ambientLightColor" ].value = new THREE.Color( ambient );
  uniforms[ "uDisplacementPostScale" ] = {type: 'f', value: scale };
  uniforms[ "diffuse" ].value = new THREE.Color( diffuse );
  uniforms[ "specular" ].value = new THREE.Color( specular );
  uniforms[ "ambient" ].value = new THREE.Color( ambient );
    uniforms[ "shininess" ].value = shininess;
	
	manager.onLoad = function(){
		material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vs,
            fragmentShader: fs,
            side: THREE.DoubleSide,
            wireframe: true
    	});
		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
	};
}

function setupListeners(){
	window.addEventListener('resize', function(){
		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect	= window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();	
	}, false);
}

function draw() {
	uniforms[ "uDisplacementPostScale" ].value = scale;
	controls.update();
	renderer.render(scene, camera);
	requestAnimationFrame(draw);
}

window.onload = function() {
	setup();
	setupListeners();
	draw();
};