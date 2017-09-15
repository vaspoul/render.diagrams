function Graphics(canvas)
{
	var canvas = canvas;
	var context = canvas.getContext('2d');
	var canvasW = canvas.width;
	var canvasH = canvas.height;
	var canvasAspect = canvasW / canvasH;

	this.onResize = function()
	{
		context = canvas.getContext('2d');
		canvasW = canvas.width;
		canvasH = canvas.height;
		canvasAspect = canvasW / canvasH;
	}

	function drawLine(a,b,color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);

		context.beginPath();
		context.moveTo(a.x,a.y);
		context.lineTo(b.x,b.y);

		if (width > 0)
		{
			context.stroke();
		}

		//context.restore();
	}

	function drawBezierCurve(a,ca,cb,b,color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);

		context.beginPath();
		context.moveTo(a.x,a.y);
		context.bezierCurveTo(ca.x,ca.y,cb.x,cb.y,b.x,b.y);

		if (width > 0)
		{
			context.stroke();
		}

		//context.restore();
	}

	function drawLineStrip(points,color,width,dash, fillColor)
	{
		if (points.length < 2)
			return;

		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);
		context.fillStyle = fillColor;

		context.beginPath();
		context.moveTo(points[0].x, points[0].y);

		for (var i = 1; i != points.length; ++i)
		{
			context.lineTo(points[i].x, points[i].y);
		}

		if (fillColor !== undefined)
		{
			context.fill();
		}

		if (width > 0)
		{
			context.stroke();
		}

		//context.restore();
	}

	function drawLines(points, color, width, dash, fillColor)
	{
		if (points.length < 2)
			return;

		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);
		context.fillStyle = fillColor;

		context.beginPath();

		for (var i = 0; i < points.length-1; i+=2)
		{
			context.moveTo(points[i].x, points[i].y);
			context.lineTo(points[i+1].x, points[i+1].y);
		}

		if (width > 0)
		{
			context.stroke();
		}

		if (fillColor !== undefined)
		{
			context.fill();
		}
		//context.restore();
	}

	function drawCross(p,size,rotation,color,width,dash)
	{
		var delta = new Vector(size, 0);
		delta = rotate(delta, rotation);

		drawLine(add(p, delta), sub(p, delta), color, width, dash);

		delta = transpose(delta);

		drawLine(add(p, delta), sub(p, delta), color, width, dash);
	}

	function drawRectangle(a,b,color,width,dash, fillColor)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(width) === "undefined")
			width = 1;

		if (typeof(dash) === "undefined")
			dash = [];

		if ( (typeof(b) !== "object") )
		{
			return drawRectangle(add(a, b/2), sub(a, b/2), color,width,dash, fillColor);
		}

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.setLineDash(dash);
		context.fillStyle = fillColor;

		context.beginPath();
		context.moveTo(a.x,a.y);
		context.lineTo(b.x,a.y);
		context.lineTo(b.x,b.y);
		context.lineTo(a.x,b.y);
		context.lineTo(a.x,a.y);
		if (fillColor !== undefined)
		{
			context.fill();
		}

		if (width > 0)
		{
			context.stroke();
		}

		//context.restore();
	}
	
	function drawArrow(pStart,pEnd,color,width,dash)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(dash) === "undefined")
			dash = [];

		if (typeof(width) === "undefined")
			width = 1;

		var length = sub(pEnd, pStart).length();
		V = sub(pEnd, pStart).unit();

		var B = add(pStart, mul(V, length-20-width/2));
		var E = add(pStart, mul(V,length));
		var T = transpose(V);
		var P0 = add(B, mul(T, 5 + width/2));
		var P1 = add(B, mul(T, -5 - width/2));

		//context.save();
		context.lineWidth = width;
		context.strokeStyle = color;
		context.fillStyle = color;
		context.setLineDash(dash);

		// Line
		context.beginPath();
		context.moveTo(pStart.x, pStart.y);
		context.lineTo(B.x, B.y);
		context.stroke();

		// Arrow head
		context.beginPath();
		context.lineWidth = 1;
		context.setLineDash([]);
		context.moveTo(E.x, E.y);
		context.lineTo(P0.x, P0.y);
		context.lineTo(P1.x, P1.y);
		context.lineTo(E.x, E.y);
		context.stroke();
		context.fill();

		//context.restore();
	}

	function drawText(O,text,color,align,angle,font)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(align) === "undefined")
			align = "center";

		if (font === undefined)
			font = "bold 16px Arial";

		//context.save();

		context.translate(O.x, O.y);

		if (angle !== undefined)
		{
			context.rotate(-angle);
		}

		context.font = font;
		context.textAlign = align;
		context.fillStyle = color;

		context.fillText(text, 0, 0);

		if (angle !== undefined)
		{
			context.rotate(angle);
		}

		context.translate(-O.x, -O.y);

		//context.restore();
	}

	function drawHemisphere(O, N, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(lineDash) === "undefined")
			lineDash = [];

		if (typeof(lineWidth) === "undefined")
			lineWidth = 1.5;
	
		if (typeof(fillColor) === "undefined")
			fillColor = "rgba(0, 0, 0, 0)";
			
		if (typeof(lineColor) === "undefined")
			lineColor = "#000000";

		N = N.unit();

		//context.save();
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.fillStyle = fillColor;
		context.setLineDash(lineDash);
	
		context.beginPath();
		
		var angle = toAngle(N);
		context.arc(O.x, O.y, radius, angle+Math.PI/2, angle-Math.PI/2, true);
		
		context.fill();
		if (width > 0)
		{
			context.stroke();
		}
	
		//context.restore();
	}

	function drawArc(O, radius, startAngle, endAngle, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(startAngle) === "undefined")
			startAngle = 0;

		if (typeof (endAngle) === "undefined")
			endAngle = Math.PI * 2;

		if (typeof (lineDash) === "undefined")
			lineDash = [];

		if (typeof(lineWidth) === "undefined")
			lineWidth = 1.5;
	
		if (typeof(fillColor) === "undefined")
			fillColor = "rgba(0, 0, 0, 0)";
			
		if (typeof(lineColor) === "undefined")
			lineColor = "#000000";

		//context.save();
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.fillStyle = fillColor;
		context.setLineDash(lineDash);
	
		context.beginPath();
		
		context.arc(O.x, O.y, radius, startAngle, endAngle, true);
		
		context.fill();
		if (lineWidth > 0)
		{
			context.stroke();
		}
	
		//context.restore();
	}

	function drawBRDFGraph(BRDF, V, N, F0, roughness, O, radius, lineColor, lineWidth, fillColor, lineDash)
	{
		if (typeof(radius) === "undefined")
			radius = 1;

		if (typeof(lineDash) === "undefined")
			lineDash = [];

		if (typeof(lineWidth) === "undefined")
			lineWidth = 1.5;
	
		if (typeof(fillColor) === "undefined")
			fillColor = "rgba(0, 255, 0, 0.1)";
			
		if (typeof(lineColor) === "undefined")
			lineColor = "#008000";

		var angStep = 1;

		var T = transpose(N);
		
		//context.save();
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.fillStyle = fillColor;
		context.setLineDash(lineDash);

		// Draw lobe outline
		context.beginPath();
		context.moveTo(O.x,O.y);

		N = N.unit();
		V = V.unit();
		
		var NdotV = dot(V,N);
		var RV = reflect(V.neg(),N);		
		var RVAngle = toAngle(RV) / Math.PI * 180;
		
		for (var ang = -180; ang <= 180; ang += angStep)
		{
			var Li = new Vector(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180));

			var brdf = BRDF(F0,N,V,Li,roughness);

			dx = Math.cos(ang * Math.PI / 180) * brdf * radius;
			dy = Math.sin(ang * Math.PI / 180) * brdf * radius;

			context.lineTo(O.x + dx, O.y + dy);
		}

		context.lineTo(O.x,O.y);
		context.fill();
		context.stroke();

		// Draw lobe rays
		context.beginPath();
		for (var ang1 = 0; ang1 <= +180; ang1 += 5)
		{
			var ang = RVAngle + ang1;
			
			var Li = new Vector(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180));

			var brdf = BRDF(F0,N,V,Li,roughness);

			dx = Math.cos(ang * Math.PI / 180) * brdf * radius;
			dy = Math.sin(ang * Math.PI / 180) * brdf * radius;

			context.moveTo(O.x, O.y);
			context.lineTo(O.x+dx, O.y+dy);
			
			if (ang1>0)
			{
				var ang = RVAngle - ang1;
				
				var Li = new Vector(Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180));

				var brdf = BRDF(F0,N,V,Li,roughness);

				dx = Math.cos(ang * Math.PI / 180) * brdf * radius;
				dy = Math.sin(ang * Math.PI / 180) * brdf * radius;

				context.moveTo(O.x, O.y);
				context.lineTo(O.x+dx, O.y+dy);
			}
		}
		context.stroke();

		//context.restore();
	}

	function drawStar(O,pointCount, outerRadius, innerRadiusFactor, rotationAngle, lineColor, lineWidth, fillColor)
	{
		if (typeof(lineWidth) === "undefined")
			lineWidth = 1.5;
	
		if (typeof(fillColor) === "undefined")
			fillColor = "rgba(0, 255, 0, 0.1)";
			
		if (typeof(lineColor) === "undefined")
			lineColor = "#008000";

		if (typeof(radius) === "undefined")
			radius = 0.1;

		if (typeof(rotationAngle) === "undefined")
			rotationAngle = 0;

		rotationAngle = rotationAngle * 180 / Math.PI;

		var angStep = 360 / pointCount;
		var innerRadius = outerRadius * innerRadiusFactor;

		//context.save();
		context.lineWidth = lineWidth;
		context.strokeStyle = lineColor;
		context.fillStyle = fillColor;
		context.setLineDash([]);

		context.beginPath();

		for (var ang = rotationAngle; ang <= 360+rotationAngle; ang += angStep)
		{
			var v = new Vector(Math.sin(ang * Math.PI / 180), Math.cos(ang * Math.PI / 180));

			dx = Math.sin((ang - angStep*0.5) * Math.PI / 180) * innerRadius;
			dy = Math.cos((ang - angStep*0.5) * Math.PI / 180) * innerRadius;

			context.lineTo(O.x + dx, O.y + dy);

			dx = Math.sin(ang * Math.PI / 180) * outerRadius;
			dy = Math.cos(ang * Math.PI / 180) * outerRadius;

			context.lineTo(O.x + dx, O.y + dy);

			dx = Math.sin((ang + angStep*0.5) * Math.PI / 180) * innerRadius;
			dy = Math.cos((ang + angStep*0.5) * Math.PI / 180) * innerRadius;

			context.lineTo(O.x + dx, O.y + dy);
		}

		context.fill();
		context.stroke();

		//context.restore();
	}	
	
	function drawLight(O,radius)
	{
		if (typeof(radius) === "undefined")
			radius = 0.08;

		drawStar(O,7,radius,0.5, "#FFC000", 1.0, "rgba(255,255,0,0.8)")
	}
	
	function clear()
	{
		//context.clearRect(0,0,canvasW,canvasH);
		context.fillStyle = "rgba(255,255,255,1)";
		context.fillRect(0,0,canvasW,canvasH);
	}
	
	
	this.clear 			= clear;
	this.drawText 		= drawText;
	this.drawArrow 		= drawArrow;
	this.drawLine		= drawLine;
	this.drawBezierCurve= drawBezierCurve;
	this.drawLines		= drawLines;
	this.drawLineStrip	= drawLineStrip;
	this.drawCross 		= drawCross;
	this.drawRectangle	= drawRectangle;
		
	this.drawHemisphere = drawHemisphere;
	this.drawArc		= drawArc;
	this.drawBRDFGraph 	= drawBRDFGraph;
	this.drawLight 		= drawLight;
	this.drawStar 		= drawStar;
}
