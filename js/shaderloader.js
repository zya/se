function shaderloader(sources, sucesscallback) {
	var shaders = [];
	for(var i = 0; i < sources.length; i++){
		var request = new XMLHttpRequest();
		request.open('GET', sources[i] , true);
		request.responseType = "text";
		request.onload = function() {
			shaders.push(request.response);
			if(shaders.length > 1){
				console.log('test');
				sucesscallback(shaders);
			}			
		};
		request.send();
	}
}