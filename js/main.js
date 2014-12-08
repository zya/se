var renderer, scene, camera;
var assets = ["objects/seh.obj",
			  "objects/sedande.obj",
			  "objects/senoghte.obj",
			  "objects/saboon.obj"];
var geometries = [];
var letters = [];

var mousemove = function(e) {
	camera.position.x = (e.x / window.innerWidth - 0.5) * 300;
	camera.position.y = (e.y / window.innerHeight - 0.5) * 100;
};

function setup() {
	document.addEventListener("mousemove", mousemove, false);
	renderer = new THREE.WebGLRenderer({
		antialias: true
	});
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0x00000);
	document.body.appendChild(renderer.domElement);
	camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.z = 800;
	scene = new THREE.Scene();

	var manager = new THREE.LoadingManager();

	manager.onLoad = function(){
		console.log('objects loaded');
	};

	manager.onFail = function(){
		console.log('objects loading failed');
	};

	var loader = new THREE.OBJLoader(manager);
	for (var i = 0; i < assets.length; i++) {
		loader.load(assets[i], function(obj) {
			geometries.push(obj);
		});
	}
}

function draw() {

	renderer.render(scene, camera);
	requestAnimationFrame(draw);
}

window.onload = function() {
	setup();
	draw();
};