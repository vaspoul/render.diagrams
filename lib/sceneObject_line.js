// ----------------------------------------------------------------------------------------------------------------
// Line
// ----------------------------------------------------------------------------------------------------------------
var lastLineAppearance = new Appearance("#900090", 1, 2, "#000000", 0);

function Line(_points)
{
	this.scene				= null;
	this.points				= _points;
	this.closed				= false;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastLineAppearance.copy();
	this.pixelMip			= -1;
	this.arrowStart			= false;
	this.arrowEnd			= false;
	this.handDrawn			= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

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
		var str = "var lineObject = new Line([";

		for (var i = 0; i != this.points.length; ++i)
		{
			if (i > 0)
			{
				str += ", ";
			}

			str += "new Vector(" + this.points[i].x + ", " + this.points[i].y + ")";
		}

		str += "]);\n";

		str += "lineObject.closed = " + this.closed + ";\n";
		str += this.appearance.saveAsJavascript("lineObject");
		str += "lineObject.pixelMip = " + this.pixelMip + ";\n";
		str += "lineObject.arrowStart = " + this.arrowStart + ";\n";
		str += "lineObject.arrowEnd = " + this.arrowEnd + ";\n";
		str += "lineObject.handDrawn = " + this.handDrawn + ";\n";
		str += "lineObject.visible = " + this.visible + ";\n";
		str += "lineObject.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(lineObject);\n";
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

		lastLineAppearance = this.appearance.copy();

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		for (var i = 0; i != this.points.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.points[i]);
			this.boundsMax = max(this.boundsMax, this.points[i]);
		}

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.addPoint = function(point)
	{
		this.points.push(point);

		this.onChange();
	}

	this.draw = function (camera)
	{
		if (this.points.length < 2)
			return;

		var lastRand = (pseudoRandom.random(0)-0.5);

		for (var mip=0; mip<=this.pixelMip; ++mip)
		{
			var points = this.points.slice();

			if (this.closed)
				points.push(this.points[0]);

			var cellSize = Math.pow(2, mip);

			for (var i = 0; i < points.length - 1; ++i)
			{
				var p0 = points[i];
				var p1 = points[i+1];
				var L = sub(p1, p0);

				var t = 0;

				while (t < 1)
				{
					var p = lerp(p0, p1, t);
					var index = div(p, cellSize);
					var index0 = floor(index);
					var index1 = add(index0, 1);
					var r0 = mul(index0, cellSize);
					var r1 = mul(index1, cellSize);

					camera.drawRectangle(r0, r1, "#000000", 1, [], this.appearance.GetFillColor());

					// Advance
					var boundary = new Vector(0, 0);

					boundary.x = (L.x>0) ? r1.x : r0.x;
					boundary.y = (L.y>0) ? r1.y : r0.y;

					var stepsToBoundaryXY = new Vector(0, 0);

					stepsToBoundaryXY.x = Math.abs(L.x)>0 ? div(sub(boundary, p).x, L.x) : Number.MAX_VALUE;
					stepsToBoundaryXY.y = Math.abs(L.y)>0 ? div(sub(boundary, p).y, L.y) : Number.MAX_VALUE;

					var stepsToBoundary = Math.min(stepsToBoundaryXY.x, stepsToBoundaryXY.y);

					stepsToBoundary += 0.0001;

					t += stepsToBoundary;
				}
			}
		}

		if (this.arrowStart && this.arrowEnd && this.points.length==2)
		{
			// Truly lazy!
			camera.drawArrow(avg(this.points[0], this.points[1]), this.points[1], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
			camera.drawArrow(avg(this.points[0], this.points[1]), this.points[0], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
		}
		else
		{
			var points = this.points.slice();

			if (this.closed)
				points.push(this.points[0]);

			if (this.handDrawn)
			{
				var divisions = 5;

				for (var i=0; i<points.length-1; ++i)
				{
					var L = sub(points[i + 1], points[i]);
					var Lm = L.length();
					var l = div(L, divisions);

					var t = mul(transpose(l), 0.5);

					for (var j=1; j<divisions; ++j)
					{
						var newRand = (pseudoRandom.random(j) - 0.5);

						points.splice(i+j, 0, add(add(points[i], mul(l, j)), mul(t, lastRand)));
						
						lastRand = newRand;
					}

					i+=divisions-1;
				}
			}

			if (this.arrowEnd)
			{
				camera.drawArrow(points[points.length-2], points[points.length-1], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
			}

			if (this.arrowStart)
			{
				camera.drawArrow(points[1], points[0], 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this);
			}

			if (this.arrowEnd)
			{
				points.splice(-1, 1);
			}

			if (this.arrowStart)
			{
				points.splice(0, 1);
			}

			camera.drawLineStrip(points, false, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			if (overlapRectLine(a, b, this.points[i], this.points[(i+1)%this.points.length]))
				return true;
		}

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var snaps = [];

		var count = this.closed ? this.points.length : this.points.length - 1;

		for (var i = 0; i != count; ++i)
		{
			snaps.push({ type: "node", p: this.points[i]});
			snaps.push({ type: "midpoint", p: avg(this.points[i], this.points[(i+1)%this.points.length])});
		}

		snaps.push({ type: "node", p: this.points[this.points.length-1]});

		return snaps;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [];

		for (var i = 0; i != this.points.length; ++i)
		{
			if (localSpace)
			{
				if (i==0)
				{
					var index0 = 0;
					var index1 = 1;
					points.push( add(this.points[index0], div(sub(this.points[index1], this.points[index0]), 20)) );
				}
				else if (i==this.points.length-1)
				{
					var index0 = this.points.length-1;
					var index1 = index0-1;
					points.push( add(this.points[index0], div(sub(this.points[index1], this.points[index0]), 20)) );
				}
				else
				{
					points.push( add(this.points[i], div(sub(this.points[i-1], this.points[i]), 20)) );
					points.push( add(this.points[i], div(sub(this.points[i+1], this.points[i]), 20)) );
				}
			}
			else
			{
				points.push(this.points[i]);
			}
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (localSpace)
		{
			var index0 = Math.floor(index/2) + (index%2);
			var index1 = (index % 2) > 0 ? (index0 - 1) : (index0 + 1);

			var L = sub(this.points[index1], this.points[index0]).unit()

			camera.drawArrow(this.points[index0], mad(L, camera.invScale(50), this.points[index0]), 13, "rgba(255,0,0," + alpha + ")", 5);
		}
		else
		{
			camera.drawRectangle(this.points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.drawDebugAngle = function(index, camera)
	{
		if (index <= 0 || index >= this.points.length-1)
			return;

		var vNext = sub(this.points[index+1], this.points[index]);
		var angleNext = toAngle(vNext);

		if (angleNext<0)
			angleNext += Math.PI*2;

		var vPrevious = sub(this.points[index-1], this.points[index]);
		var anglePrevious = toAngle(vPrevious);

		if (anglePrevious<0)
			anglePrevious += Math.PI*2;

		var deltaAngle = anglePrevious - angleNext;

		var textPoint = add(this.points[index], mul(fromAngle((angleNext+anglePrevious) * 0.5), camera.invScale(60)));
		camera.drawArc(this.points[index], camera.invScale(50), Math.min(anglePrevious, angleNext), Math.max(anglePrevious, angleNext), "#000000", 1, undefined, [5,5]);
		camera.drawText(textPoint, (Math.abs(deltaAngle) * 180/Math.PI).toFixed(1) + "°", "#000000", "center", 0, "12px Arial");
	}

	this.drawDebugLineInfo = function(index, camera)
	{
		if (index < 0 || index >= this.points.length-1)
			return;

		var vNext = sub(this.points[index+1], this.points[index]);
		var angleNext = toAngle(vNext);

		if (angleNext<0)
			angleNext += Math.PI*2;

		var offsetSign = 1;

		if (angleNext>=Math.PI/2 && angleNext<Math.PI*3/2)
		{
			angleNext += Math.PI;
			offsetSign = -1;
		}

		var textPoint = addv(this.points[index], mul(vNext, 0.5), mul(transpose(vNext).unit().neg(), offsetSign * camera.invScale(10)));
		camera.drawText(textPoint, "dx: " + vNext.x.toFixed(1) + " dy: " + vNext.y.toFixed(1) + " L: " + vNext.length().toFixed(1), "#000000", "center", angleNext, "12px Arial");
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (localSpace)
		{
			var index0 = Math.floor(index/2) + (index%2);
			var index1 = (index % 2) > 0 ? (index0 - 1) : (index0 + 1);

			var L = sub(this.points[index0], this.points[index1]).unit();

			this.points[index0] = add(this.points[index1], mul(dot(sub(p, this.points[index1]), L), L));
		}
		else
		{
			this.points[index] = p;
		}

		if (camera != undefined)
		{
			this.drawDebugAngle(index, camera);
			this.drawDebugAngle(index-1, camera);
			this.drawDebugAngle(index+1, camera);
			
			this.drawDebugLineInfo(index, camera);
			this.drawDebugLineInfo(index-1, camera);
		}

		this.onChange();
	}

	this.deleteDragPoint = function(index)
	{
		this.points.splice(index, 1);
		this.onChange();
	}

	this.getOrigin = function ()
	{
		return this.points[0];
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.points[0]);

		for (var i = 0; i != this.points.length; ++i)
		{
			this.points[i] = add(this.points[i], delta);
		}

		this.onChange();
	}

	this.transform = function(currentRect, newRect)
	{
		for (var i = 0; i != this.points.length; ++i)
		{
			var localCoord = new Vector(	dot(sub(this.points[i], currentRect.center), currentRect.scaledXAxis),
											dot(sub(this.points[i], currentRect.center), currentRect.scaledYAxis) );

			localCoord.x /= currentRect.scaledXAxis.lengthSqr();
			localCoord.y /= currentRect.scaledYAxis.lengthSqr();

			this.points[i] = add(mad(localCoord.x, newRect.scaledXAxis, newRect.center), mul(localCoord.y, newRect.scaledYAxis));
		}

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Arrow Start", control: new TickBox(this.arrowStart, function (value) { this.arrowStart = value; this.onChange(); }.bind(this)) },
					{name: "Arrow End", control: new TickBox(this.arrowEnd, function (value) { this.arrowEnd = value; this.onChange(); }.bind(this)) },
					{name: "Hand Drawn", control: new TickBox(this.handDrawn, function (value) { this.handDrawn = value; this.onChange(); }.bind(this)) },
					{name: "Pixelate Mip", control: new PopoutSlider(-1, 5, this.pixelMip, 1, function (value) { this.pixelMip = value; this.onChange(); }.bind(this)) },
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
