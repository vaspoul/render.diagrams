// ----------------------------------------------------------------------------------------------------------------
// Text
// ----------------------------------------------------------------------------------------------------------------
function Text(anchorPoint, initialText)
{
	this.scene				= null;
	this.anchorPoint		= anchorPoint;
	this.text				= "";
	this.lines				= [];
	this.halign				= 1;
	this.valign				= 1;
	this.angle				= 0;
	this.lineSpacing		= 1.6;
	this.font				= "Arial";
	this.fontSize			= 1.0;
	this.maxWidth			= 0;
	this.totalHeight		= 0;
	this.appearance			= new Appearance();
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
		var str = "var text = new Text(";

		str += "new Vector(" + this.anchorPoint.x + ", " + this.anchorPoint.y + ")";
		str += ", unescape(\"" + escape(this.text) + "\")";
		str += ");\n";

		str += "text.halign = \"" + this.halign + "\";\n";
		str += "text.valign = \"" + this.valign + "\";\n";
		str += "text.font = \"" + this.font + "\";\n";
		str += "text.fontSize = " + this.fontSize + ";\n";
		str += this.appearance.saveAsJavascript("text");
		str += "text.angle = " + this.angle + ";\n";
		str += "text.lineSpacing = " + this.lineSpacing + ";\n";

		str += "text.visible = " + this.visible + ";\n";
		str += "text.frozen = " + this.frozen + ";\n";
		str += "text.maxWidth = " + this.maxWidth + ";\n";
		str += "text.totalHeight = " + this.totalHeight + ";\n";

		str += "scene.addObject(text);\n";
		return str;
	}

	this.setText = function(s)
	{
		this.text = s;
		this.lines = s.split("\n");
		this.onChange();
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.updateBounds = function()
	{
		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
		var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

		var vMin = 0;
		var vMax = 0;

		if (this.valign == 0)
		{
			vMin = -this.totalHeight;
			vMax = 0;
		}
		else if (this.valign == 1)
		{
			vMin = -this.totalHeight * 0.5;
			vMax = this.totalHeight * 0.5;
		}
		else if (this.valign == 2)
		{
			vMin = 0;
			vMax = this.totalHeight;
		}

		var hMin = 0;
		var hMax = 0;

		if (this.halign == 0)
		{
			hMin = 0;
			hMax = this.maxWidth;
		}
		else if (this.halign == 1)
		{
			hMin = -this.maxWidth * 0.5;
			hMax = this.maxWidth * 0.5;
		}
		else if (this.halign == 2)
		{
			hMin = -this.maxWidth;
			hMax = 0;
		}

		var corners = [ mad(yAxis, vMin, mad(xAxis, hMin, this.anchorPoint)),
						mad(yAxis, vMin, mad(xAxis, hMax, this.anchorPoint)),
						mad(yAxis, vMax, mad(xAxis, hMin, this.anchorPoint)),
						mad(yAxis, vMax, mad(xAxis, hMax, this.anchorPoint)) ];

		for (var i=0; i!=corners.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, corners[i]);
			this.boundsMax = max(this.boundsMax, corners[i]);
		}
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.updateBounds();

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		this.maxWidth = 0;
		this.totalHeight = 0;

		var fontSize = camera.scale(this.fontSize);
		var font = fontSize + "px " + this.font;

		for (var i=0; i!=this.lines.length; ++i)
		{
			var lineSize = camera.measureText(this.lines[i], font);
			
			this.maxWidth = Math.max(this.maxWidth, lineSize.x);
			this.totalHeight += lineSize.y * this.lineSpacing;
		}

		this.updateBounds();

		var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
		var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

		if (this.selected)
		{
			camera.drawLine(this.anchorPoint, mad(xAxis, this.maxWidth, this.anchorPoint), this.appearance.GetLineColor(), 1, [3, 3]);
		}

		var vOffset = 0;

		if (this.valign == 0)
		{
			vOffset = 0;
		}
		else if (this.valign == 1)
		{
			vOffset = this.totalHeight * 0.5;
		}
		else if (this.valign == 2)
		{
			vOffset = this.totalHeight;
		}

		for (var i=0; i!=this.lines.length; ++i)
		{
			var lineSize = camera.measureText(this.lines[i], font);
			var hOffset = 0;

			if (this.halign == 0)
			{
				hOffset = 0;
			}
			else if (this.halign == 1)
			{
				hOffset = -lineSize.x * 0.5;
			}
			else if (this.halign == 2)
			{
				hOffset = -lineSize.x;
			}

			vOffset += -lineSize.y * this.lineSpacing;

			var p = mad(yAxis, vOffset, mad(xAxis, hOffset, this.anchorPoint));

			camera.drawText(p, this.lines[i], this.appearance.GetLineColor(), "left", this.angle * Math.PI / 180, font);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
		var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

		var hMin = 0;
		var hMax = 0;

		if (this.halign == 0)
		{
			hMin = 0;
			hMax = this.maxWidth;
		}
		else if (this.halign == 1)
		{
			hMin = -this.maxWidth * 0.5;
			hMax = this.maxWidth * 0.5;
		}
		else if (this.halign == 2)
		{
			hMin = -this.maxWidth;
			hMax = 0;
		}

		var vOffset = 0;

		if (this.valign == 0)
		{
			vOffset = 0;
		}
		else if (this.valign == 1)
		{
			vOffset = this.totalHeight * 0.5;
		}
		else if (this.valign == 2)
		{
			vOffset = this.totalHeight;
		}

		var lineHeight = this.totalHeight / this.lines.length;

		vOffset += lineHeight * 0.5;
		
		for (var i=0; i!=this.lines.length; ++i)
		{
			vOffset += -lineHeight;

			if (overlapRectLine(a, b, mad(yAxis, vOffset, mad(xAxis, hMin, this.anchorPoint)), mad(yAxis, vOffset, mad(xAxis, hMax, this.anchorPoint))))
			{
				return true;
			}
		}


		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "center", p: this.anchorPoint } ];
		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var xAxis = rotate(new Vector(1, 0), this.angle * Math.PI / 180);
		var yAxis = rotate(new Vector(0, 1), this.angle * Math.PI / 180);

		var points = [ this.anchorPoint, mad(xAxis, this.maxWidth, this.anchorPoint) ];

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
			this.anchorPoint = p;
		}
		else
		{
			this.angle = toAngle(sub(p, this.anchorPoint)) * 180 / Math.PI;
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.anchorPoint;
	}
	
	this.setOrigin = function(p)
	{
		this.anchorPoint = p;
		this.onChange();
	}

	this.getProperties = function()
	{
		var appearanceControl = new PopoutContainer(undefined, "images/color_wheel.svg");
		{
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, false, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Text", control: new PopoutTextBox(this.text, "multi", true, 0, function (value) { this.setText(value); this.onChange(); }.bind(this)) },
					{name: "Font", control:new TextBox(this.font, true, false, 32, function(value){ this.font = value; this.onChange(); }.bind(this) )},
					{name: "Font Size", control: new PopoutSlider(0.1, 5.0, this.fontSize, 0.1, function (value) { this.fontSize = value; this.onChange(); }.bind(this)) },
					{name: "Line Spacing", control: new PopoutSlider(0.1, 5.0, this.lineSpacing, 0.1, function (value) { this.lineSpacing = value; this.onChange(); }.bind(this)) },
					{name: "H Align", control: new Dropdown(["left", "center", "right"], this.halign, function (value) { this.halign = value; this.onChange(); }.bind(this) )},
					{name: "V Align", control: new Dropdown(["top", "center", "bottom"], this.valign, function (value) { this.valign = value; this.onChange(); }.bind(this) )},
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

	this.setText(initialText);
}
