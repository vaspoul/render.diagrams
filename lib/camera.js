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
	
	var lines = [];

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
	
	function invScale(v)
	{
		return div(v,view_unitScale)
	}

	this.clear = function()
	{
		graphics.clear();
		lines = [];
	}

	function drawLine(a,b,color,width,dash,addToSnapList)
	{
		if (addToSnapList === undefined)
			addToSnapList = false;

		if (addToSnapList)
		{
			lines.push({a:a, b:b});
		}

		return graphics.drawLine(transformP(a), transformP(b), color, width, dash);
	}

	function drawLines(points,color,width,dash,addToSnapList)
	{
		if (addToSnapList === undefined)
			addToSnapList = false;

		if (addToSnapList)
		{
			for (var i = 0; i != points.length - 1; ++i)
			{
				lines.push({a:points[i], b:points[i+1]});
			}
		}

		for (var i = 0; i != points.length; ++i)
		{
			points[i] = transformP(points[i]);
		}

		return graphics.drawLines(points, color, width, dash);
	}

	function drawCross(p, s, r, color, width, dash)
	{
		return graphics.drawCross(transformP(p), scale(s), r, color, width, dash);
	}

	function drawRectangle(a, b, color, width, dash, fillColor)
	{
		if ( (typeof(b) !== "object") )
			return graphics.drawRectangle(transformP(a), scale(b), color, width, dash, fillColor);
		else
			return graphics.drawRectangle(transformP(a), transformP(b), color, width, dash, fillColor);
	}

	function drawArrow(O,V,length,color,width,dash)
	{
		return graphics.drawArrow(transformP(O), transformN(V), scale(length), color, width, dash);
	}

	function drawText(O,text,color,align)
	{
		return graphics.drawText(transformP(O),text,color,align);
	}

	function drawHemisphere(O, N, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		return graphics.drawHemisphere(transformP(O), transformN(N), scale(radius), lineColor, lineWidth, fillColor, lineDash);
	}

	function drawArc(O, radius, startAngle, endAngle, lineColor, lineWidth, fillColor, lineDash)
	{
		return graphics.drawArc(transformP(O), scale(radius), -startAngle, -endAngle, lineColor, lineWidth, fillColor, lineDash);
	}

	function drawBRDFGraph(BRDF, V, N, F0, roughness, O, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(radius) === "undefined")
			radius = 1;
		
		return graphics.drawBRDFGraph(BRDF, transformN(V), transformN(N), F0, roughness, transformP(O), scale(radius), lineColor, lineWidth, fillColor, lineDash);
	}

	function drawStar(O, pointCount, outerRadius, innerRadiusFactor, lineColor, lineWidth, fillColor)
	{
		return graphics.drawStar(transformP(O), pointCount, scale(outerRadius), innerRadiusFactor, lineColor, lineWidth, fillColor);
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
		
	function getSnapPoints()
	{
		var points = [];

		for (var i=0; i!=lines.length; ++i)
		{
			for (var j=i+1; j<lines.length; ++j)
			{
				var A = lines[i].a;
				var B = lines[i].b;
				var C = lines[j].a;
				var D = lines[j].b;

				var AB = sub(B, A);
				var AC = sub(C, A);
				var CD = sub(D, C);
				var tan = transpose(AB).unit();
				var d = -dot(AC, tan);
				var CD_along_tan = dot(CD.unit(), tan);
				var CD_factor = d / CD_along_tan;

				var I = add(C, mul(CD.unit(), CD_factor));

				var dAB = dot(sub(I, A), AB.unit());
				var dCD = dot(sub(I, C), CD.unit());

				if (dAB < 0 || dCD < 0 || dAB > distance(A, B) || dCD > distance(C, D))
					continue;

				points.push(I);
			}
		}

		return points;
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
	this.scale				= scale;
	this.invScale			= invScale;
	this.invTransformP		= invTransformP;
	this.drawText 			= drawText;
	this.drawArrow 			= drawArrow;
	this.drawLine			= drawLine;
	this.drawLines			= drawLines;
	this.drawCross 			= drawCross;
	this.drawRectangle		= drawRectangle;
	this.drawHemisphere 	= drawHemisphere;
	this.drawArc			= drawArc;
	this.drawBRDFGraph		= drawBRDFGraph;
	this.drawLight			= drawLight;
	this.drawStar			= drawStar;
	this.getMousePos		= getMousePos;
	this.getSnapPoints		= getSnapPoints;

	function init()
	{
		setViewPosition(0, 0);
		setUnitScale(96/2.54 * 1.25 * 0.5);
	}

	init();
}
