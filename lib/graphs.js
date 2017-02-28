function Graph(canvas)
{
	var canvas = canvas;
	var context = canvas.getContext('2d');
	var canvasW = canvas.width;
	var canvasH = canvas.height;
	var canvasR = Math.min(canvasW, canvasH) * 0.5;
	var canvasAspect = canvasW / canvasH;

	var minX;
	var maxX;
	var minY;
	var maxY;

	var unitsPerPixel = {x:0, y:0};
	var dragStartPos = {x:-1, y:-1};
	var dragOffset = {x:0, y:0}
	var g_MousePos = {x:0, y:0}
	var g_MouseActive = false;

	var legendPos = {x:0, y:0};
	var tickDelta = {x:0, y:0};

    var enableLegend = false;
    var enableAxes = false;

    var plotFunctions = [];
	var dataSets = [];

	function init()
	{
		canvas.addEventListener('mousemove', onMouseMove, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
		canvas.addEventListener('mouseenter', onMouseEnter, false);
		canvas.addEventListener('mouseleave', onMouseLeave, false);
		canvas.addEventListener('mouseup', onMouseUp, false);
		canvas.addEventListener('wheel', onMouseWheel, false);

		reset();
	}

	function setLimits(_minX, _maxX, _minY, _maxY)
	{
		minX = _minX;
		maxX = _maxX;
		minY = _minY;
		maxY = _maxY;

		unitsPerPixel.x = (maxX-minX);
		unitsPerPixel.y = (maxY-minY);
	}

	function getLimits()
	{
		return {minX:minX, maxX:maxX, minY:minY, maxY:maxY};
	}
	
	function XC(x)
	{
		return (x - minX) / (maxX - minX) * canvasW ;
	}

	function YC(y)
	{
		return canvasH - (y - minY) / (maxY - minY) * canvasH ;
	}

	function onMouseEnter(evt)
	{
		g_MouseActive = true;
		draw();
	}

	function onMouseLeave(evt)
	{
		g_MouseActive = false;
		draw();
	}
	
	function onMouseDown(evt)
	{
		var m = getMousePos(evt, canvas);
		g_MousePos = getMousePos(evt, canvas);
		
		dragStartPos = m;
		dragOffset.x = 0;
		dragOffset.y = 0;
	}

	function onMouseUp(evt)
	{
	}

	function onMouseWheel(evt)
	{
		g_MouseActive = true;
		var m = getMousePos(evt, canvas);
		g_MousePos = getMousePos(evt, canvas);

		var zoomCenter = m;
		zoomCenter.x = minX + (zoomCenter.x) * (maxX-minX);
		zoomCenter.y = maxY - (zoomCenter.y) * (maxY-minY);

		var zoomFactor = 1.0 + Math.sign(evt.deltaY) * 0.1;

		minX = zoomCenter.x - (zoomCenter.x - minX) * zoomFactor;
		maxX = zoomCenter.x + (maxX-zoomCenter.x) * zoomFactor;

		minY = zoomCenter.y - (zoomCenter.y - minY) * zoomFactor;
		maxY = zoomCenter.y + (maxY-zoomCenter.y) * zoomFactor;

//		minX = round(minX);
//		maxX = round(maxX);
//		minY = round(minY);
//		maxY = round(maxY);

		setLimits(minX, maxX, minY, maxY);
		draw();
	}

	function onMouseMove(evt)
	{
		//g_MouseActive = true;
		//var m = getMousePos(evt, canvas);
		//g_MousePos = getMousePos(evt, canvas);
		
		//if (evt.buttons & 1)
		//{
		//	minX -= dragOffset.x;
		//	maxX -= dragOffset.x;
		//	minY -= dragOffset.y;
		//	maxY -= dragOffset.y;

		//	dragOffset.x = -(m.x - dragStartPos.x) * unitsPerPixel.x;
		//	dragOffset.y = (m.y - dragStartPos.y) * unitsPerPixel.y;

		//	dragOffset.x = Math.round(dragOffset.x);
		//	dragOffset.y = Math.round(dragOffset.y);

		//	minX += dragOffset.x;
		//	maxX += dragOffset.x;
		//	minY += dragOffset.y;
		//	maxY += dragOffset.y;
		//}

		//draw();
	}

	function draw()
	{
		clear();

		drawAxes();

		for (var i=0; i!=plotFunctions.length; ++i)
		{
			plotFunction2D(plotFunctions[i][0], plotFunctions[i][1], plotFunctions[i][2], plotFunctions[i][3]);
		}
		
		for (var i=0; i!=dataSets.length; ++i)
		{
			plotDataSet2D(dataSets[i][0], dataSets[i][1], dataSets[i][2]);
		}

		drawLegend();
		
		if (g_MouseActive)
		{
			drawMouseLegent();
		}
	}

	function drawMouseLegent()
	{
		var mouseGraphX = minX + (g_MousePos.x) * (maxX-minX);
		var mouseGraphY = maxY - (g_MousePos.y) * (maxY-minY);
		
		var x = g_MousePos.x * canvasW;
		var y = g_MousePos.y * canvasH;
		
		var align = g_MousePos.x>0.5 ? "right" : "left";
		
		// Shift text so that it's not under mouse cursor
		if (g_MousePos.x<=0.5)
		{
			x += 10;
		}
		else
		{
			x -=5;
		}
		
		drawText(x, y, mouseGraphX.toFixed(2) + ", " + mouseGraphY.toFixed(2), "#000000", align);
		y += 10;

		for (var i=0; i!=plotFunctions.length; ++i)
		{
			var F = plotFunctions[i][0];
			var steps = plotFunctions[i][1];
			var color = plotFunctions[i][2];
			var label = plotFunctions[i][3];
			
			drawText(x, y, label + " : " + F(mouseGraphX).toFixed(2), color, align);
			
			y += 10;
		}
		
	}
	
	function drawText(x,y,text,color,align)
	{
		if (typeof(color) === "undefined")
			color = "#000000";

		if (typeof(align) === "undefined")
			align = "center";

		context.save();

		context.font = "10px Arial";
		context.textAlign = align;
		context.fillStyle = color;

		context.fillText(text, x, y);

		context.restore();
	}
	
	function drawLine(x0,y0,x1,y1,color,width)
	{
		context.save() ;
		context.lineWidth = width;
		context.strokeStyle = color;

		context.beginPath() ;
		context.moveTo(x0,y0) ;
		context.lineTo(x1,y1) ;
		context.stroke() ;

		context.restore();
	}

	function drawGraphLine(x0,y0,x1,y1,color,width)
	{
		drawLine(XC(x0),YC(y0),XC(x1),YC(y1),color,width) ;
	}

	function reset()
	{
		clear();
		plotFunctions = [];
		dataSets = [];
	}

	function clear()
	{
		context.clearRect(0,0,canvasW,canvasH) ;
	}

	function addFunction2D(F, stepsX, color, label)
	{
		plotFunctions.push([F, stepsX, color, label]);
	}

	function addDataset2D(points, color, label)
	{
		dataSets.push([points, color, label]);
	}

	function plotFunction2D(F, stepsX, color, label)
	{
		context.save() ;

		context.beginPath();

		context.moveTo( XC(minX), YC( F(minX) ) ) ;

		deltaX = (maxX-minX)/stepsX;

		for (var x = minX; x <= maxX; x += deltaX)
		{
			context.lineTo( XC(x), YC( F(x) ) ) ;
		}

		context.lineWidth = 1 ;
		context.strokeStyle = color;
		context.stroke();

		context.restore() ;
	}

	function plotDataSet2D(points, color, label)
	{
		context.save() ;

		context.beginPath();

		context.moveTo( XC(points[0].x), YC(points[0].y) ) ;

		for (var i=0; i!=points.length; ++i)
		{
			context.lineTo( XC(points[i].x), YC(points[i].y) ) ;
		}

		context.lineWidth = 1 ;
		context.strokeStyle = color;
		context.stroke();

		context.restore() ;
	}

	function showAxes(tickDeltaX, tickDeltaY)
    {
  		tickDelta.x = tickDeltaX;
		tickDelta.y = tickDeltaY;
        enableAxes = true;
    }

	function hideAxes()
    {
        enableAxes = false;
    }

	function drawAxes()
	{
        if (!enableAxes)
            return;

		context.save();
		context.lineWidth = 1 ;

		for (var x = Math.floor(minX/tickDelta.x)*tickDelta.x; x <= Math.floor(maxX/tickDelta.x)*tickDelta.x; x += tickDelta.x)
		{
			drawGraphLine(x, minY, x, maxY, "#808080", 1);
		}

		for (var y = Math.floor(minY/tickDelta.y)*tickDelta.y; y <= Math.floor(maxY/tickDelta.y)*tickDelta.y; y += tickDelta.y)
		{
			drawGraphLine(minX, y, maxX, y, "#808080", 1);
		}

		drawGraphLine(minX, 0, maxX, 0, "#000000", 1.5);
		drawGraphLine(0, minY, 0, maxY, "#000000", 1.5);

		context.fillStyle = "blue";
		context.font = "bold 16px Arial";

		var textX = Math.max(0, Math.min(canvasW-20, XC(0)+5));
		var textY = Math.max(0, Math.min(canvasH-5, YC(0)+20));

		context.fillText(minX.toFixed(2), XC(minX)+5, Math.min(canvasH-20, textY));
		context.fillText(maxX.toFixed(2), XC(maxX)-21, textY);
		context.fillText(minY.toFixed(2), textX, YC(minY)-5);
		context.fillText(maxY.toFixed(2), textX, YC(maxY)+16);

		context.restore();
	}

    function showLegend(x, y)
    {
        enableLegend = true;
		legendPos.x = x;
		legendPos.y = y;
    }

    function hideLegend()
    {
        enableLegend = false;
    }

	function drawLegend()
	{
        if (!enableLegend)
            return;

		var maxWidth = 0;

		context.save();

		context.font = "bold 12px Arial";

		for (var i=0; i!=plotFunctions.length; ++i)
		{
			maxWidth = Math.max(maxWidth, context.measureText(plotFunctions[i][3]).width);
		}

		for (var i=0; i!=dataSets.length; ++i)
		{
			maxWidth = Math.max(maxWidth, context.measureText(dataSets[i][2]).width);
		}

		var x = legendPos.x;
		var y = legendPos.y;
		
		context.beginPath();
		context.rect(x,y,40+maxWidth, 20*(plotFunctions.length+dataSets.length)+10);
		context.fillStyle = 'white';
		context.fill();
		context.lineWidth = 2;
		context.strokeStyle = 'black';
		context.stroke();

		context.fillStyle = "blue";

		for (var i=0; i!=plotFunctions.length; ++i)
		{
			drawLine(x+5, y + i*20+15, x+5+20, y + i*20+15, plotFunctions[i][2], 1.0);

			context.fillText(plotFunctions[i][3], x+5+20+5,y + i*20+15+4);
		}

		for (var i=0; i!=dataSets.length; ++i)
		{
			drawLine(x+5, y + i*20+15, x+5+20, y + i*20+15, dataSets[i][1], 1.0);

			context.fillText(dataSets[i][2], x+5+20+5,y + i*20+15+4);
		}

		context.restore();
	}

	function getCanvas()
	{
		return canvas;
	}
	
	function getContext()
	{
		return context;
	}

	init();

	this.setLimits = setLimits;
	this.getLimits = getLimits;
	this.addFunction2D = addFunction2D;
	this.addDataset2D = addDataset2D;

	this.showAxes = showAxes;
	this.hideAxes = hideAxes;

	this.showLegend = showLegend;
	this.hideLegend = hideLegend;

	this.draw = draw;
	this.reset = reset;
	
	this.getContext = getContext;
	this.getCanvas = getCanvas;
}
