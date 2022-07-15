// ----------------------------------------------------------------------------------------------------------------
// Rectangle
// ----------------------------------------------------------------------------------------------------------------
var lastRectAppearance = new Appearance("#900090", 1, 2);

function Rectangle(center)
{
	this.scene				= null;
	this.points				= [ center.copy(), center.copy(), center.copy(), center.copy() ];
	this.rows				= 1;
	this.columns			= 1;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastRectAppearance.copy();
	this.centerPoints		= false;
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
		var str = "var rectObj = new Rectangle(";

		str += "new Vector(0,0)";
		str += ");\n";

		str += "rectObj.points[0] = new Vector(" + this.points[0].x + ", " + this.points[0].y + ");\n";
		str += "rectObj.points[1] = new Vector(" + this.points[1].x + ", " + this.points[1].y + ");\n";
		str += "rectObj.points[2] = new Vector(" + this.points[2].x + ", " + this.points[2].y + ");\n";
		str += "rectObj.points[3] = new Vector(" + this.points[3].x + ", " + this.points[3].y + ");\n";
		str += this.appearance.saveAsJavascript("rectObj");
		str += "rectObj.rows = " + this.rows + ";\n";
		str += "rectObj.columns = " + this.columns + ";\n";
		str += "rectObj.centerPoints = " + this.centerPoints + ";\n";
		str += "rectObj.visible = " + this.visible + ";\n";
		str += "rectObj.frozen = " + this.frozen + ";\n";
		str += "rectObj.onChange();\n";

		str += "scene.addObject(rectObj);\n";
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

		lastRectAppearance = this.appearance.copy();

		var center = avg(this.points[0], this.points[2]);
		var halfSize = abs(sub(this.points[0], center));

		this.boundsMin = sub(center, halfSize);
		this.boundsMax = add(center, halfSize);

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.setSize = function(w,h)
	{
		var half = new Vector(w*0.5, h*0.5);

		var center = avg(this.points[0], this.points[2]);

		this.points[0] = add(center, new Vector(-w*0.5, +h*0.5));
		this.points[1] = add(center, new Vector(+w*0.5, +h*0.5));
		this.points[2] = add(center, new Vector(+w*0.5, -h*0.5));
		this.points[3] = add(center, new Vector(-w*0.5, -h*0.5));

		this.onChange();
	}

	this.draw = function(camera)
	{
		camera.drawLineStrip(this.points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);

		if (this.rows > 1 || this.columns > 1)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaX1 = div(sub(this.points[2], this.points[3]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);
			var deltaY1 = div(sub(this.points[2], this.points[1]), this.rows);

			var points = [];

			for (var i = 1; i <= this.columns - 1; ++i)
			{
				var pX0 = mad(deltaX0, i, this.points[0]);
				var pX1 = mad(deltaX1, i, this.points[3]);

				points.push(pX0);
				points.push(pX1);
			}

			for (var i = 1; i <= this.rows - 1; ++i)
			{
				var pY0 = mad(deltaY0, i, this.points[0]);
				var pY1 = mad(deltaY1, i, this.points[1]);

				points.push(pY0);
				points.push(pY1);
			}

			camera.drawLines(points, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), [], this.appearance.GetFillColor(), this);
		}

		if (this.centerPoints)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);

			for (var i = 0.5; i <= this.columns; i += 1)
			{
				var pX = mad(deltaX0, i, this.points[0]);

				for (var j = 0.5; j <= this.rows; j += 1)
				{
					var pY = mad(deltaY0, j, pX);

					camera.drawCross(pY, camera.invScale(5), 0, "#808080", 2);
				}
			}
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (	overlapRectLine(a, b, this.points[0], this.points[1]) ||
				overlapRectLine(a, b, this.points[1], this.points[2]) ||
				overlapRectLine(a, b, this.points[2], this.points[3]) ||
				overlapRectLine(a, b, this.points[3], this.points[0]))
		{
			return true;
		}

		if (this.rows > 1 || this.columns > 1)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaX1 = div(sub(this.points[2], this.points[3]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);
			var deltaY1 = div(sub(this.points[2], this.points[1]), this.rows);

			for (var i = 1; i <= this.columns - 1; ++i)
			{
				var pX0 = mad(deltaX0, i, this.points[0]);
				var pX1 = mad(deltaX1, i, this.points[3]);

				if (overlapRectLine(a, b, pX0, pX1))
					return true;
			}

			for (var i = 1; i <= this.rows - 1; ++i)
			{
				var pY0 = mad(deltaY0, i, this.points[0]);
				var pY1 = mad(deltaY1, i, this.points[1]);

				if (overlapRectLine(a, b, pY0, pY1))
					return true;
			}
		}

		if (this.appearance.fillAlpha > 0)
		{
			if (	b.x<this.points[0].x ||
					a.x>this.points[2].x ||
					b.y<this.points[2].y ||
					a.y>this.points[0].y)
			{
				return false;
			}

			return true;
		}

		return false;
	}
	
	this.getSnapPoints = function()
	{
		var points = [	{ type: "node", p: this.points[0] },
						{ type: "node", p: this.points[1] },
						{ type: "node", p: this.points[2] },
						{ type: "node", p: this.points[3] },
						{ type: "midpoint", p: avg(this.points[0], this.points[1]) },
						{ type: "midpoint", p: avg(this.points[1], this.points[2]) },
						{ type: "midpoint", p: avg(this.points[2], this.points[3]) },
						{ type: "midpoint", p: avg(this.points[3], this.points[0]) },
						{ type: "center", p: avg(this.points[0], this.points[2]) } ];

		if (this.rows > 1 || this.columns > 1)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);

			for (var i = 0; i <= this.columns; ++i)
			{
				var pX = mad(deltaX0, i, this.points[0]);

				for (var j = 0; j <= this.rows; ++j)
				{
					var pY = mad(deltaY0, j, pX);

					if (	((i == 0 || i == (this.columns)) && (j>0 && j<this.rows)) ||
							((j == 0 || j == (this.rows)) && (i>0 && i<this.columns)) )
					{
						points.push({type: "node", p: pY });
					}
					else if ( (i>0 && i<this.columns) && (j>0 && j<this.rows) )
					{
						points.push({type: "intersection", p: pY });
					}
				}
			}
		}


		if (this.centerPoints)
		{
			var deltaX0 = div(sub(this.points[1], this.points[0]), this.columns);
			var deltaY0 = div(sub(this.points[3], this.points[0]), this.rows);

			for (var i = 0.5; i <= this.columns; i += 1)
			{
				var pX = mad(deltaX0, i, this.points[0]);

				for (var j = 0.5; j <= this.rows; j += 1)
				{
					var pY = mad(deltaY0, j, pX);

					points.push({type: "node", p: pY });
				}
			}
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index<4)
		{
			camera.drawRectangle(this.points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var index0 = index-4;
			var index1 = (index0+1) % 4;

			var a = avg(this.points[index0], this.points[index1]);
			var dir = sub(this.points[index1], this.points[index0]).unit().neg();
			var tan = transpose(dir);
	
			var b = add(a, mul(tan, camera.invScale(30)));

			camera.drawArrow(a, b, 8, "rgba(255,0,0," + alpha + ")", 3);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		var points = [	this.points[0],
						this.points[1],
						this.points[2],
						this.points[3],
						avg(this.points[0], this.points[1]),
						avg(this.points[1], this.points[2]),
						avg(this.points[2], this.points[3]),
						avg(this.points[3], this.points[0])];

		if (index < 4)
		{
			if (localSpace)
			{
				var center = avg(this.points[0], this.points[2]);
				var halfSize = abs(sub(p, center));

				this.points[0] = sub(center, halfSize);
				this.points[2] = add(center, halfSize);
				this.points[1].x = this.points[2].x;
				this.points[1].y = this.points[0].y;
				this.points[3].x = this.points[0].x;
				this.points[3].y = this.points[2].y;
			}
			else
			{
				this.points[index] = p;

				if (index==0)
				{
					this.points[3].x = p.x;
					this.points[1].y = p.y;
				}
				else if (index==1)
				{
					this.points[2].x = p.x;
					this.points[0].y = p.y;
				}
				else if (index==2)
				{
					this.points[1].x = p.x;
					this.points[3].y = p.y;
				}
				else if (index==3)
				{
					this.points[0].x = p.x;
					this.points[2].y = p.y;
				}
			}
		}
		else if (index < 8)
		{
			if (index==4)
			{
				this.points[0].y = p.y;
				this.points[1].y = p.y;
			}
			else if (index==5)
			{
				this.points[1].x = p.x;
				this.points[2].x = p.x;
			}
			else if (index==6)
			{
				this.points[2].y = p.y;
				this.points[3].y = p.y;
			}
			else if (index==7)
			{
				this.points[0].x = p.x;
				this.points[3].x = p.x;
			}
		}
		else
		{ }

		if (camera != undefined)
		{
			var p0 = this.points[0].copy();
			var p1 = this.points[2].copy();

			var delta = sub(p1, p0);

			var p = p1.copy();
			p.x += ((p1.x < p0.x) ? +1 : -1) * camera.invScale(10);
			p.y += camera.invScale(10);

			camera.drawText(p, "dx: " + delta.x.toFixed(1) + " dy: " + delta.y.toFixed(1), "#000000", (p1.x < p0.x) ? "left" : "right", 0, "12px Arial");
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.points[0];
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(p, this.points[0]);

		for (var i = 0; i != 4; ++i)
		{
			this.points[i] = add(this.points[i], delta);
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
					{name: "Rows", control: new PopoutSlider(1, 16, this.rows, 1, function (value) { this.rows = value; this.onChange(); }.bind(this)) },
					{name: "Columns", control: new PopoutSlider(1, 16, this.columns, 1, function (value) { this.columns = value; this.onChange(); }.bind(this)) },
					{name: "Center Points", control: new TickBox(this.centerPoints, function (value) { this.centerPoints = value; this.onChange(); }.bind(this)) }
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
