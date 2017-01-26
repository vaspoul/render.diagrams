function GammaGraphs(docTag)
{
	var graph;
	var minXslider;
	var maxXslider;

	function setup()
	{
		var root = document.getElementById(docTag);
		
		var canvas = document.createElement('canvas');
		canvas.width  = 700;
		canvas.height = 700;
//		canvas.style.position = "absolute";
		canvas.style.border   = "2px solid black";
		canvas.style.marginLeft = "auto";
		canvas.style.marginRight = "auto";
		canvas.style.display = "block";
		
		minXslider = new Slider(root, "minX", 0, 2, 0, 0.1, updateGraphs);
		maxXslider = new Slider(root, "maxX", 0, 2, 2, 0.1, updateGraphs);
		
		root.appendChild(canvas);
		root.appendChild(minXslider);
		root.appendChild(maxXslider);
		
		graph = new Graph(canvas);
		graph.setLimits(minXslider.currentValue, maxXslider.currentValue, 0.0, 2);
		graph.showAxes((maxXslider.currentValue-minXslider.currentValue)/10.0, 0.1);
	}
	
	function gamma(x,gamma)
	{
		return Math.pow(x, 1.0 / gamma);
	}
	
	function gamma20(x) 
	{
		return gamma(x, 2.0);
	}

	function gamma22(x) 
	{
		return gamma(x, 2.2);
	}

	function gamma24(x) 
	{
		return gamma(x, 2.4);
	}
	
	function sRGB(x) 
	{
		sRGBLo = x * 12.92;
		sRGBHi = ( Math.pow( Math.abs ( x ), 1.0/2.4) * 1.055) - 0.055;
		return ( x <= 0.0031308) ? sRGBLo : sRGBHi ;
	}

	function updateGraphs() 
	{
		var minX = minXslider.currentValue;
		var maxX = Math.max(minX + 0.1, maxXslider.currentValue); 
		graph.setLimits(minX, maxX, 0.0, 2);
		graph.showAxes((maxX-minX)/10.0, 0.1);
		graph.draw();
	}

	setup();
	
	graph.addFunction2D(sRGB, 500, "#000000", "sRGB");
	graph.addFunction2D(gamma20, 500, "#FF0000", "2.0");
	graph.addFunction2D(gamma22, 500, "#00FF00", "2.2");
	graph.addFunction2D(gamma24, 500, "#0000FF", "2.4");

	graph.showLegend(20, 10);
	updateGraphs();
}
