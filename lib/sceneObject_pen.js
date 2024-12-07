// ----------------------------------------------------------------------------------------------------------------
// Pen
// ----------------------------------------------------------------------------------------------------------------
var lastPenAppearance = new Appearance("#4287f5", 1, 2);

function Pen()
{
	this.scene					= null;
	this.points					= [];
	this.pointsAvg				= [];
	this.bezierCurves			= [];
	this.pointSmoothingFactor	= 0.5;
	this.bezierErrorFactor		= 0.5;
	this.drawLines				= false;
	this.drawBezier				= true;
	this.drawBezierPoints		= false;
	this.arrowStart			= false;
	this.arrowEnd			= false;
	this.selected				= false;
	this.visible				= true;
	this.frozen					= false;
	this.appearance				= lastPenAppearance.copy();
	this.onChangeListeners		= [];
	this.boundsMin				= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax				= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.saveAsJavascript = function()
	{
		var str = "var pen = new Pen();\n";

		str += "pen.points = [";

		for (var i = 0; i != this.points.length; ++i)
		{
			if (i > 0)
			{
				str += ", ";
			}

			str += "new Vector(" + this.points[i].x + ", " + this.points[i].y + ")";
		}

		str += "];\n";

		str += "pen.pointSmoothingFactor = " + this.pointSmoothingFactor + ";\n";
		str += "pen.bezierError = " + this.bezierErrorFactor + ";\n";
		str += "pen.drawLines = " + this.drawLines + ";\n";
		str += "pen.drawBezier = " + this.drawBezier + ";\n";
		str += "pen.drawBezierPoints = " + this.drawBezierPoints + ";\n";
		str += "pen.arrowStart = " + this.arrowStart + ";\n";
		str += "pen.arrowEnd = " + this.arrowEnd + ";\n";
		str += this.appearance.saveAsJavascript("pen");
		str += "pen.visible = " + this.visible + ";\n";
		str += "pen.frozen = " + this.frozen + ";\n";
		
		if (this.name != undefined)
		{
			str += "pen.name = \"" + this.name + "\";\n";
		}

		str += "pen.finalize();\n";

		str += "scene.addObject(pen);\n";
		return str;
	}

	this.addChangeListener = function (listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		lastPenAppearance = this.appearance.copy();

		this.smoothPoints();

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i = 0; i != this.pointsAvg.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.pointsAvg[i]);
			this.boundsMax = max(this.boundsMax, this.pointsAvg[i]);
		}


		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.smoothPoints = function()
	{
		var k = Math.round(this.pointSmoothingFactor * 10);

		if (k>0)
		{
			for (var i = Math.max(0, this.pointsAvg.length-k-1); i != this.points.length; ++i)
			{
				var avgPoint = new Vector(0,0);
				var sumWeight = 0;

				for (var j= i-k; j <= i+k; ++j)
				{
					if (j>=0 && j<this.points.length)
					{
						var weight = Math.pow(1 - Math.abs(j-i)/k, 2);
						avgPoint = mad(this.points[j], weight, avgPoint);
						sumWeight += weight;
					}
				}

				if (i >= this.pointsAvg.length)
					this.pointsAvg.push( div(avgPoint, sumWeight) );
				else
					this.pointsAvg[i] = div(avgPoint, sumWeight);
			}
		}
		else
		{
			this.pointsAvg = this.points.slice();
		}
	}

	this.addPoint = function(p, camera)
	{
		if (this.points.length>0)
		{
			if (distanceSqr(p, this.points[this.points.length-1]) <= Math.pow(camera.invScale(1), 2))
			{
				return;
			}
		}

		this.points.push( p.copy() );

		if (this.points.length > 1)
			this.onChange();
	}

	this.finalize = function()
	{
		this.pointsAvg = [];

		this.smoothPoints();

		if (this.points.length > 1)
		{
			var maxError = this.bezierErrorFactor * 0.25;

			this.bezierCurves = fitBezierCurve(this.pointsAvg, maxError);
			this.onChange();
		}
	}

	this.draw = function(camera)
	{
		var drawArrows = false;

		if (this.drawLines || this.bezierCurves.length == 0)
		{
			drawArrows = true;
			camera.drawLineStrip(this.pointsAvg, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor());
		}

		if (this.drawBezier)
		{
			drawArrows = true;
			camera.drawBezierCurves( this.bezierCurves, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
		}

		if (this.drawBezierPoints)
		{
			for (var i = 0; i != this.bezierCurves.length; ++i)
			{
				camera.drawCross( this.bezierCurves[i][0], camera.invScale(5));
				camera.drawCross( this.bezierCurves[i][3], camera.invScale(5));
			}
		}
		
		// TODO: line/bezier extends a few pixels outside arrowhead!
		if (drawArrows && this.arrowStart)
		{
			camera.drawArrow(this.pointsAvg[1], this.pointsAvg[0], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
		}

		if (drawArrows && this.arrowEnd)
		{
			camera.drawArrow(this.pointsAvg[this.pointsAvg.length-2], this.pointsAvg[this.pointsAvg.length-1], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		for (var i = 0; i != this.bezierCurves.length; ++i)
		{
			if (overlapRectBezier(a, b, this.bezierCurves[i]))
				return true;
		}

		return false;

		if (this.pointsAvg.length>1)
		{
			for (var i = 0; i != this.pointsAvg.length-1; ++i)
			{
				if (overlapRectLine(a, b, this.pointsAvg[i], this.pointsAvg[i+1]))
					return true;
			}
		}

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var points = [];

		if (this.bezierCurves.length>0)
			points.push({ type: "node", p: this.bezierCurves[0 ][0]});

		for (var i = 0; i != this.bezierCurves.length; ++i)
		{
			points.push({ type: "node", p: this.bezierCurves[i][3]});
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		return [];
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
	}

	this.getOrigin = function()
	{
		return this.pointsAvg[0];
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.pointsAvg[0]);

		for (var i = 0; i != this.points.length; ++i)
		{
			this.points[i] = add(this.points[i], delta);
		}

		this.finalize();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Point Smoothing", control: new Slider(0, 100, this.pointSmoothingFactor * 100, 1, function (value) { this.pointSmoothingFactor = value / 100; this.pointsAvg = []; this.onChange(); }.bind(this)) },
					{name: "Bezier Error Threshold", control: new Slider(0, 100, this.bezierErrorFactor * 100, 1, function (value) { this.bezierErrorFactor = value / 100; this.finalize(); }.bind(this)) },
					{name: "drawLines", control: new TickBox(this.drawLines, function (value) { this.drawLines = value; this.onChange({refreshProperties:true}); }.bind(this)) },
					{name: "drawBezier", control: new TickBox(this.drawBezier, function (value) { this.drawBezier = value; this.onChange({refreshProperties:true}); }.bind(this)) },
					{name: "drawBezierPoints", control: new TickBox(this.drawBezierPoints, function (value) { this.drawBezierPoints = value; this.onChange({refreshProperties:true}); }.bind(this)) },
					{name: "Arrow Start", control: new TickBox(this.arrowStart, function (value) { this.arrowStart = value; this.onChange(); }.bind(this)) },
					{name: "Arrow End", control: new TickBox(this.arrowEnd, function (value) { this.arrowEnd = value; this.onChange(); }.bind(this)) },
				];
	}

	this.toggleVisibility = function(v)
	{
		var newVisible = (v!==undefined) ? v : !this.visible;
		if (this.visible != newVisible)
		{
			this.visible = newVisible;
			this.onChange();
		}
	}

	this.isVisible = function()
	{
		return this.visible;
	}

	this.toggleFrozen = function(f)
	{
		this.frozen = (f!==undefined) ? f : !this.frozen;
		this.onChange();
	}

	this.isFrozen = function()
	{
		return this.frozen;
	}

	this.setSelected = function(selected)
	{
		this.selected = selected;
	}

	this.isSelected = function()
	{
		return this.selected;
	}

	this.onChange();
}
