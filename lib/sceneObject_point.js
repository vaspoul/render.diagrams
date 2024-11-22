// ----------------------------------------------------------------------------------------------------------------
// Page Point
// ----------------------------------------------------------------------------------------------------------------
function Point(origin)
{
	this.scene				= null;
	this.origin				= origin;
	this.halfSize			= 0.35;
	this.shape				= 4;
	this.shapeLabels		= [ "Cross", "X", "Circle", "Square", "Diamond" ];
	this.appearance			= new Appearance("#000000", 1, 1);
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
		var str = "var point = new Point(";

		str += "new Vector(" + this.origin.x + ", " + this.origin.y + ")";
		str += ");\n";

		str += this.appearance.saveAsJavascript("point");
		str += "point.halfSize = " + this.halfSize + ";\n";
		str += "point.shape = " + this.shape + ";\n";
		str += "point.visible = " + this.visible + ";\n";
		str += "point.frozen = " + this.frozen + ";\n";
		str += "point.onChange();\n";

		str += "scene.addObject(point);\n";
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

		this.boundsMin = add(this.origin, -this.halfSize);
		this.boundsMax = add(this.origin, +this.halfSize);

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		if (this.shape == 0) // cross
		{
			camera.drawCross(this.origin, this.halfSize, 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
		}
		else if (this.shape == 1) // X 
		{
			camera.drawCross(this.origin, this.halfSize, Math.PI / 4, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
		}
		else if (this.shape == 2) // circle
		{
			camera.drawArc(this.origin, this.halfSize, undefined, undefined, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawRectangle(this.origin, camera.invScale(4), this.appearance.GetLineColor(), 0, undefined, this.appearance.GetLineColor());
		}
		else if (this.shape == 3) // square
		{
			camera.drawRectangle(this.boundsMin, this.boundsMax, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			camera.drawRectangle(this.origin, camera.invScale(4), this.appearance.GetLineColor(), 0, undefined, this.appearance.GetLineColor());
		}
		else if (this.shape == 4) // diamond
		{
			camera.drawRectangle(this.origin, this.halfSize * 2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), undefined, undefined, Math.PI / 4);
			camera.drawRectangle(this.origin, camera.invScale(4), this.appearance.GetLineColor(), 0, undefined, this.appearance.GetLineColor());
		}

		camera.addPoint(this.origin, this);
	}
	
	this.hitTest = function(a, b, camera)
	{
		var rectMin = min(a, b);
		var rectMax = max(a, b);

		return	this.origin.x >= rectMin.x &&
				this.origin.y >= rectMin.y &&
				this.origin.x <= rectMax.x &&
				this.origin.y <= rectMax.y;
	}
	
	this.getSnapPoints = function()
	{
		return [
			{ type: "center", p: this.origin },
		];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		return [this.origin];
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		camera.drawRectangle(this.origin, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		this.origin = p;

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.origin;
	}
	
	this.setOrigin = function(p)
	{
		this.origin = p;

		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{ name: "Appearance", control:appearanceControl },
					{ name: "Shape", control: new Dropdown(this.shapeLabels, this.shape, function (value) { this.shape = value; this.onChange(); }.bind(this)) },
					{ name: "Size", control: new Slider(0, 5, this.halfSize * 2, 0.1, function (value) { this.halfSize = value / 2; this.onChange(); }.bind(this)) },
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
