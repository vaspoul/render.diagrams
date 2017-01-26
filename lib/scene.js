function Scene()
{
	var objects = [];
	
	this.addObject = function (object)
	{
		objects.push(object);
	}
	
	this.draw = function(camera)
	{
		camera.clear();
		
		for (var i=0; i<objects.length; ++i)
		{
			objects[i].draw(camera);
		}
	}
}

function Camera(canvas)
{
	var view_scale = {x:1, y:1};
	var view_bias = {x:0, y:0};
	var view_position = {x:0, y:0};
	var view_unitScale = 1;
	
	var graphics = new Graphics(canvas);
	var canvas = canvas;
	var context = canvas.getContext('2d');
	var canvasW = canvas.width;
	var canvasH = canvas.height;
	var canvasAspect = canvasW / canvasH;
	
	function updateProjection()
	{
		view_scale.x = view_unitScale;
		view_scale.y = -view_unitScale;
		view_bias.x = -view_position.x * view_scale.x + canvasW/2;
		view_bias.y = canvasH/2 - view_position.y * view_scale.y;
	}

	function setViewPosition(x,y)
	{
		view_position.x = x;
		view_position.y = y;
		updateProjection();
	}
	
	function setUnitScale(s)
	{
		view_unitScale = Math.max(1,s);
		updateProjection();
	}
	
	function transformP(v)
	{
		return mad(v, view_scale, view_bias);
	}
	
	function transformN(v)
	{
		return mul(v, view_scale);
	}

	function invTransformP(v)
	{
		return div(sub(v, view_bias), view_scale);
	}

	function scale(v)
	{
		return mul(v,view_unitScale)
	}
	
	
	this.clear = function()
	{
		graphics.clear();
	}

	function drawLine(a,b,color,width,dashed)
	{
		return graphics.drawLine(transformP(a), transformP(b), color, width, dashed);
	}
	
	function drawArrow(O,V,length,color,width,dashed)
	{
		return graphics.drawArrow(transformP(O), transformN(V), scale(length), color, width, dashed);
	}

	function drawText(O,text,color,align)
	{
		return graphics.drawText(transformP(O),text,color,align);
	}

	function drawHemisphere(O, N, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		return graphics.drawHemisphere(transformP(O), transformN(N), scale(radius), lineColor, lineWidth, fillColor, lineDash);
	}

	function drawBRDFGraph(BRDF, V, N, F0, roughness, O, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(radius) === "undefined")
			radius = 1;
		
		return graphics.drawBRDFGraph(BRDF, transformN(V), transformN(N), F0, roughness, transformP(O), scale(radius), lineColor, lineWidth, fillColor, lineDash);
	}

	function drawStar(O, pointCount, outerRadius, innerRadiusFactor, lineColor, lineWidth, fillColor)
	{
		return graphics.drawStar(transformP(O), pointCount, outerRadius, innerRadiusFactor, lineColor, lineWidth, fillColor);
	}	
	
	function drawLight(O,radius)
	{
		return graphics.drawLight(transformP(O), scale(radius));
	}
	
	function getMousePos(evt)
	{
		var rect = canvas.getBoundingClientRect();

		var p= 	{
					x: (evt.clientX - rect.left),
					y: (evt.clientY - rect.top)
				};

		return invTransformP(p);
	}
		
	this.getUnitScale	 	= function() { return view_unitScale; 	}
	this.getViewBias		= function() { return view_bias; 	 	}
	this.getViewPosition	= function() { return view_position; 	}
	this.getViewSize		= function() { return new Vector(canvasW/view_unitScale, canvasH/view_unitScale); }
	this.getCanvas			= function() { return canvas;		 	}
	this.getGraphics		= function() { return graphics;		 	}

	this.setViewPosition	= setViewPosition;
	this.setUnitScale		= setUnitScale;

	this.transformP			= transformP;
	this.transformN			= transformN;
	this.invTransformP		= invTransformP;
	this.drawText 			= drawText;
	this.drawArrow 			= drawArrow;
	this.drawLine 			= drawLine;
	this.drawHemisphere 	= drawHemisphere;
	this.drawBRDFGraph 		= drawBRDFGraph;
	this.drawLight 			= drawLight;
	this.getMousePos		= getMousePos;
	
	function init()
	{
		setViewPosition(0, 0);
		setUnitScale(96/2.54 * 1.25 * 0.5);
	}

	init();
}
