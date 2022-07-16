// ----------------------------------------------------------------------------------------------------------------
// Axis
// ----------------------------------------------------------------------------------------------------------------
function Axis(firstPoint)
{
	this.scene				= null;
	this.orientation		= "horizontal";
	this.p0					= firstPoint;
	this.p1					= firstPoint;
	this.length				= 1;
	this.spacing			= 1;
	this.textLabel			= 0;
	this.absolute			= false;	// absolute shows the coordinates of the ticks themselves, i.e. doesn't necessarily start at 0
	this.appearance			= new Appearance("#000000", 1, 2);
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
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
		var str = "var axis = new Axis(";
		str += "new Vector(" + this.p0.x  + ", " + this.p0.y + ")";
		str += ");\n";

		str += "text.p0 = new Vector(" + this.p0.x  + ", " + this.p0.y + ");\n";
		str += "text.p1 = new Vector(" + this.p1.x  + ", " + this.p1.y + ");\n";
		str += "text.length = " + this.length + ";\n";
		str += "text.orientation = \"" + this.orientation + "\";\n";
		str += "text.textLabel = " + this.textLabel + ";\n";
		str += "text.spacing = " + this.spacing + ";\n";
		str += "text.absolute = " + this.absolute + ";\n";

		str += this.appearance.saveAsJavascript("text");
		str += "text.visible = " + this.visible + ";\n";
		str += "text.frozen = " + this.frozen + ";\n";
		str += "text.maxWidth = " + this.maxWidth + ";\n";
		str += "text.totalHeight = " + this.totalHeight + ";\n";

		str += "scene.addObject(axis);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.boundsMin = this.p0;
		this.boundsMax = this.p1;

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		camera.drawLine(this.p0, this.p1, "#000000", this.appearance.GetLineWidth(this.selected));

		var v0;
		var v1;
		var p0;
		var tan;

		var dir = sub(this.p1, this.p0).unit();
		var textAlign;
		var textOffset;

		if (this.orientation == "horizontal")
		{
			v0 = this.p0.x;
			v1 = this.p1.x;
			p0 = new Vector(0, this.p0.y);
			tan = mul(transpose(dir), camera.invScale(this.textLabel<2 ? 10 : -10));
			textAlign = "center";
			textOffset = this.textLabel<2 ? 2.5 : 1.5;
		}
		else
		{
			v0 = this.p0.y;
			v1 = this.p1.y;
			p0 = new Vector(this.p0.x, 0);
			tan = mul(transpose(dir), camera.invScale(this.textLabel<2 ? -10 : 10));
			textAlign = this.textLabel<2 ? "right" : "left";
			textOffset = this.textLabel<2 ? 2.5 : 2.5;
		}

		var i0 = Math.ceil(v0 / this.spacing);
		var i1 = Math.floor(v1 / this.spacing);

		var points = [];

		for (var i = i0; i<=i1; ++i)
		{
			points.push(mad(i * this.spacing, dir, p0));
			points.push(add(tan, mad(i * this.spacing, dir, p0)));

			var textPoint = mad(tan, textOffset, mad(i * this.spacing, dir, p0));

			if (this.textLabel != 1)
			{
				if (this.absolute)
				{
					camera.drawText(textPoint, i * this.spacing, "#000000", "center", 0);
				}
				else
				{
					camera.drawText(textPoint, (i-i0) * this.spacing, "#000000", "center", 0);
				}
			}
		}

		camera.drawLines(points, "#000000", 1);
	}
	
	this.hitTest = function(a, b, camera)
	{
		if (overlapRectLine(a, b, this.p0, this.p1))
		{
			return true;
		}

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "node", p: this.p0 }, { type: "node", p: this.p1 } ];
		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [ this.p0, this.p1 ];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		var points = this.getDragPoints(localSpace, camera);

		camera.drawRectangle(points[index], camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0)
		{
			this.p0 = p;
			this.p1 = mad(this.length, sub(this.p1, this.p0).unit(), this.p0);
		}
		else
		{
			this.p1 = p;
		}

		var v = sub(this.p1, this.p0);

		if (v.lengthSqr()>0)
		{
			if (Math.abs(v.x) >= Math.abs(v.y))
			{
				this.orientation = "horizontal";

				this.p1.y = this.p0.y;
			
				if (this.p1.x < this.p0.x)
				{
					this.p1.x = this.p0.x + 1;
				}
			}
			else
			{
				this.orientation = "vertical";
			
				this.p1.x = this.p0.x;
			
				if (this.p1.y < this.p0.y)
				{
					this.p1.y = this.p0.y + 1;
				}
			}

			this.length = sub(this.p1, this.p0).length();

			this.onChange();
		}
	}

	this.getOrigin = function()
	{
		return this.p0;
	}
	
	this.setOrigin = function(p)
	{
		var delta = sub(this.p1, this.p0);

		this.p0 = p;
		this.p1 = add(this.p0, delta);

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{name: "Spacing", control: new PopoutSlider(0.5, 10, this.spacing, 0.5, function (value) { this.spacing = Math.max(0.1,value); this.onChange(); }.bind(this)) },
					{name: "Text Label", control: new Dropdown(["Below", "None", "Above"], this.textLabel, function (value) { this.textLabel = value; this.onChange(); }.bind(this)) },
					{name: "Absolute Coords", control: new TickBox(this.absolute, function (value) { this.absolute = value; this.onChange(); }.bind(this)) },
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
}
