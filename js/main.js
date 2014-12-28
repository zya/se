//--------------------- audio global vars ----------------------//
window.AudioContext = (window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext);
var context = new AudioContext();
var analyser = context.createAnalyser();
analyser.fftSize = 2048;
analyser.smoothingTimeConstant = 0.7;
var filter = context.createBiquadFilter();
filter.type = 'highpass';
filter.frequency.value = 5000;
filter.connect(analyser);
var frequencyData = new Uint8Array(analyser.frequencyBinCount);
var isloaded = false;
var isPlaying = false;

var dummyOsc = context.createOscillator();
var dummyGain = context.createGain();
dummyOsc.connect(dummyGain);

//audio files
var audioElements = [];
var currentAudio = null;
var sc_client_id = '?client_id=c625af85886c1a833e8fe3d740af753c';

//--------------------- three global vars ----------------------//
var renderer, scene, camera, controls;
var mesh = new THREE.Mesh(), geometry, material;
var vertices =[], originalvertices = [];
var textures = [];
var offset1, offset2, offset3;
var ambient = 0x000000, 
	diffuse = 0x000000, 
	specular = 0x000000, 
	shininess = 0.0,
	scale = 60;
var uniforms;
var vs, fs;
var texture1, texture2, texture3, texture4;
var canvas;
var previous = 0;
var beat = 0;
var threshold = 60;

//--------------------- helper methods ----------------------//
var map = function(value, istart, istop, ostart, ostop) {
	return ostart + (ostop - ostart) * ((value - istart) / (istop - istart));
};
//--------------------- setup ----------------------//
function setup() {

    var canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'main');
    document.getElementById('full').appendChild(canvas);
    renderer = new THREE.WebGLRenderer({
        preserveDrawingBuffer: true,
        canvas: canvas,
        antialias: true
    });
    renderer.setClearColor(new THREE.Color('black'), 1);
    renderer.setSize(window.innerWidth, window.innerHeight);

    scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 3000);
	camera.position.z = 600;

	controls = new THREE.OrbitControls(camera);
	controls.minDistance = 200;
	controls.maxDistance = 900;
	controls.noKeys = true;
	controls.maxPolarAngle = 2.2;
	controls.minPolarAngle = 0.8;
	controls.maxAzimuthAngle = 0.9;
	controls.minAzimuthAngle = -0.9;
	controls.noPan = true;
	controls.autoRotate = false;
	controls.autoRotateSpeed = 0.25;
	controls.zoomSpeed = 0.15;
	controls.rotateUp(-0.2);
	controls.rotateLeft(-0.2);

	geometry = new THREE.PlaneBufferGeometry(200,200,90,90);
    geometry.dynamic = true;
	geometry.computeTangents();

	var manager = new THREE.LoadingManager();
	var loader = new THREE.XHRLoader(manager);

	loader.load('shaders/vs.glsl', function(e){
		vs = e;
	});

	loader.load('shaders/fs.glsl', function(e){
		fs = e;
	});


	texture1 = new THREE.ImageUtils.loadTexture('images/32.png');
    texture2 = new THREE.ImageUtils.loadTexture('images/senoghte.png');
    texture3 = new THREE.ImageUtils.loadTexture('images/sedand.png');
    texture4 = new THREE.ImageUtils.loadTexture('images/saboon.png');
    textures.push(texture1,texture2,texture3,texture4);

    var shader = THREE.ShaderLib.normalmap;
	uniforms = THREE.UniformsUtils.clone(shader.uniforms);
	uniforms[ "enableDisplacement" ].value = true;
    uniforms[ "enableDiffuse" ].value = 0;
    uniforms[ "tDiffuse" ].value = texture1;
    uniforms[ "tDiffuseOpacity" ] = { type: 'f', value: 1.0 };
    uniforms[ "tDisplacement" ] = { type: 't', value: texture1};
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

        vertices = mesh.geometry.getAttribute("position").array;
        for(var i = 0; i < vertices.length; i++){
            originalvertices.push(vertices[i]);
        }

        offset1 = Math.ceil(vertices.length / 8);
        offset2 = Math.ceil(vertices.length / 1.9);
        offset3 = Math.ceil(vertices.length / 2.5);

        isloaded = true;
		scene.add(mesh);

        document.getElementById('spinner').style.visibility = 'hidden';
        document.getElementById('full').style.visibility = 'visible';
	};
}
//--------------------- drawing methods ----------------------//
function analyseAudio(){
	analyser.getByteFrequencyData(frequencyData);
}

function autoRotate(){
    var time = Date.now();
    var value = Math.sin(time * 0.00009) * 0.4;
    mesh.rotation.y = value;
}

function updateVertices(){

	if(isloaded) {
        var sum = 0;
        for(var i = 0; i < frequencyData.length; i++){
            sum += frequencyData[i];
            var index = Math.ceil(map(i, 0, frequencyData.length, 0, vertices.length));
            var value = map(frequencyData[i], 0, 256, 1, 1.3);
            vertices[index + offset1 + 200] = originalvertices[index + offset1 + 200] * value;
            vertices[index + offset2 + 200] = originalvertices[index + offset2 + 200] * value;
            vertices[index + offset3] = originalvertices[index + offset3] * value;
        }
        var average = sum/frequencyData.length;
        beat++;
        if( average > 20) {
            scale = average + 20;
            if(beat % 130 === 0){
                changeRandomTexture();
                if(scale > 50){
                    renderer.autoClear = false;
                    setTimeout(function(){
                        renderer.autoClear = true;
                    },1300);
                }
            }
            if(scale > threshold){
                beat++;
            }
        }
        geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

    }
}

function change(texture){
    uniforms.tDisplacement.value = texture;
    uniforms.tDiffuse.value = texture;
}

function screenshot(){
    var link = document.getElementById('screen');
    renderer.render(scene, camera);
    var img = renderer.domElement.toDataURL("se.png");
    link.href = img;
    link.download = 'se.png';
    link.click();
}
//--------------------- event listeners ----------------------//
function setupListeners(){
    var link = document.createElement('a');
    link.id = "screen";
    document.body.appendChild(link);

    window.addEventListener('resize', function(){
        s = window.innerHeight > window.innerWidth ? window.innerWidth : window.innerHeight;
		renderer.setSize( window.innerWidth, window.innerHeight);
		camera.aspect	= window.innerWidth /  window.innerHeight;
		camera.updateProjectionMatrix();	
	}, false);

    document.getElementById('main').addEventListener('dblclick',changeRandomTexture, false);

    document.getElementById('fullscreen').addEventListener('click', function(){
        document.getElementById('full').webkitRequestFullscreen();
    }, false);

    document.getElementById('screenshot').addEventListener('click', screenshot, false);

    document.getElementById('hide').addEventListener('click', function(){
        document.getElementById('controls').style.display = 'none';
        document.getElementById('name').style.display = 'none';
        document.getElementById('show').style.display = 'block';
    }, false);

    document.getElementById('show').addEventListener('click', function(){
        document.getElementById('controls').style.display = 'block';
        document.getElementById('name').style.display = 'block';
        document.getElementById('show').style.display = 'none';
    }, false);

    document.getElementById('question').addEventListener('click', function(){
        var display = document.getElementById('help').style.display;
        if(display === 'none'){
            document.getElementById('help').style.display = 'block';
        }else{
            document.getElementById('help').style.display = 'none';
        }
    }, false);
    var z = 0;
    document.getElementById('main').addEventListener('touchstart', function(){
        if(z === 0){
            console.log('dummy started');
            var now = context.currentTime;
            dummyOsc.start(now);
            z = 1;
        }
    }, false);

    document.getElementById('play').addEventListener('click', function(){
        if(isPlaying){
            currentAudio.pause();
            this.className = "fa fa-play icon";
            isPlaying = false;
        }else{
            currentAudio.play();
            this.className = "fa fa-pause icon";
            isPlaying = true;
        }
    }, false);

}

function changeRandomTexture(){
    var random = generateRandom(previous);
    previous = random;
    change(textures[random]);
}

function generateRandom(prev){
    var randNumber = 0;
    do {
        var num = Math.floor(Math.random() * 4);
        randNumber = num;
    } while (randNumber == prev);
    return randNumber;
}

function loadAudio(){
    var iter = 0;
    var senoghte = new Audio();
    senoghte.src = 'audio/1.mp3';
    senoghte.controls = true;
    document.body.appendChild(senoghte);
    var sedandeh = new Audio();
    sedandeh.src = 'audio/1.mp3';
    var saboon = new Audio();
    saboon.src = 'audio/1.mp3';
    audioElements.push(senoghte, sedandeh, saboon);

    for(var i=0 ; i < audioElements.length; i++){
        audioElements[i].addEventListener('canplaythrough', function(){
            iter++;
            if(iter === 3){
                console.log('Audio Files Can Play Through');
                document.getElementById('loadingaudio').style.visibility = 'hidden';
                document.getElementById('audiospin').style.visibility = 'hidden';
//                document.getElementById('play').className = "fa fa-pause icon";
                playaudioelement(audioElements[0]);
                isPlaying = true;
                audioElements[0].addEventListener('ended', function(){
                    playaudioelement(audioElements[1]);
                },false);
                audioElements[1].addEventListener('ended', function(){
                    playaudioelement(audioElements[2]);
                },false);
            }
        });
    }
}

function playaudioelement(audio){
    var source = context.createMediaElementSource(audio);
    source.connect(filter);
    source.connect(analyser);
    source.connect(context.destination);
//    audio.play();
    currentAudio = audio;
}

//--------------------- draw ----------------------//
function draw() {
	analyseAudio();
	updateVertices();
	controls.update();
    autoRotate();
	uniforms[ "uDisplacementPostScale" ].value = scale;
    renderer.render(scene, camera);
    requestAnimationFrame(draw);
}

window.onload = function() {
    loadAudio();
    setup();
	setupListeners();
	draw();
};