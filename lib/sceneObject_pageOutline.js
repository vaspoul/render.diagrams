// ----------------------------------------------------------------------------------------------------------------
// Page Outline
// ----------------------------------------------------------------------------------------------------------------
function PageOutline(origin)
{
	this.scene				= null;
	this.origin				= origin;
	this.sizeIndex			= 1;
	this.sizeLabels			= [ "A5", "A4", "A3", "A2", "A1", "A0", "B5", "B4", "B3", "B2", "B1", "B0" ];
	this.sizes				= [ [14.8, 21.0], [21.0, 29.7], [29.7, 42.0], [42.0, 59.4], [59.4, 84.1], [84.1, 118.9], [17.6, 25.0], [25.0, 35.3], [35.3, 50.0], [50.0, 70.7], [70.7, 100.0], [100.0, 141.4] ];
	this.portrait			= 1;
	this.appearance			= new Appearance("#000000", 1, 2);
	this.margin				= 2.5;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);
	this.points				= [];

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
		var str = "var pageOutline = new PageOutline(";

		str += "new Vector(" + this.origin.x + ", " + this.origin.y + ")";
		str += ");\n";

		str += this.appearance.saveAsJavascript("pageOutline");
		str += "pageOutline.sizeIndex = " + this.sizeIndex + ";\n";
		str += "pageOutline.visible = " + this.visible + ";\n";
		str += "pageOutline.frozen = " + this.frozen + ";\n";
		str += "pageOutline.portrait = " + this.portrait + ";\n";
		str += "pageOutline.margin = " + this.margin + ";\n";
		str += "pageOutline.onChange();\n";

		str += "scene.addObject(pageOutline);\n";
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

		this.boundsMin = this.origin;
		this.boundsMax = add(this.origin, new Vector(this.sizes[this.sizeIndex][this.portrait ^ 1], this.sizes[this.sizeIndex][this.portrait]));

		this.points[0] = new Vector(this.origin.x,													this.origin.y);
		this.points[1] = new Vector(this.origin.x + this.sizes[this.sizeIndex][this.portrait ^ 1],	this.origin.y);
		this.points[2] = new Vector(this.origin.x + this.sizes[this.sizeIndex][this.portrait ^ 1],	this.origin.y + this.sizes[this.sizeIndex][this.portrait]);
		this.points[3] = new Vector(this.origin.x,													this.origin.y + this.sizes[this.sizeIndex][this.portrait]);

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		camera.drawRectangle(this.boundsMin, this.boundsMax, "#000000", this.appearance.GetLineWidth(this.selected));

		if (this.margin>0)
		{
			var a = add(this.boundsMin, this.margin);
			var b = sub(this.boundsMax, this.margin);

			camera.drawRectangle(a, b, "#000000", this.appearance.GetLineWidth(this.selected)/2, [5,5]);
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

		return false;
	}
	
	this.getSnapPoints = function()
	{
		return [
			{ type: "node", p: this.points[0]},
			{ type: "node", p: this.points[1]},
			{ type: "node", p: this.points[2]},
			{ type: "node", p: this.points[3]},
			{ type: "midpoint", p: avg(this.points[0], this.points[1])},
			{ type: "midpoint", p: avg(this.points[1], this.points[2])},
			{ type: "midpoint", p: avg(this.points[2], this.points[3])},
			{ type: "midpoint", p: avg(this.points[3], this.points[0])},
			{ type: "center", p: avg(this.points[0], this.points[2])},
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
					{ name: "Size", control: new Dropdown(this.sizeLabels, this.sizeIndex, function (value) { this.sizeIndex = value; this.onChange(); }.bind(this)) },
					{ name: "Portrait", control: new TickBox(this.portrait, function (value) { this.portrait = value ? 1 : 0; this.onChange(); }.bind(this)) },
					{ name: "Margin", control: new PopoutSlider(0, 5, this.margin, 0.25, function (value) { this.margin = value; this.onChange(); }.bind(this)) },
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
