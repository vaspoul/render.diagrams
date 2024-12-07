// ----------------------------------------------------------------------------------------------------------------
// Image Object
// ----------------------------------------------------------------------------------------------------------------
var lastImageAppearance = new Appearance("#900090", 0, 2, "#FFFFFF", 1);

function ImageObject(origin)
{
	this.scene				= null;
	this.origin				= origin;
	this.angle				= 0;
	this.sizeX				= 0;
	this.sizeY				= 0;
	this.imgSrc				= "images/color_wheel.svg";
	this.appearance			= lastImageAppearance.copy();
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax			= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);
	this.points				= [];
	this.img				= new Image();
	this.imageReady			= false;
	this.xAxis				= new Vector(1,0);
	this.yAxis				= new Vector(0,-1);

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
		var str = "var imageObject = new ImageObject(";

		str += "new Vector(" + this.origin.x + ", " + this.origin.y + ")";
		str += ");\n";

		str += "imageObject.imgSrc = \"" + this.imgSrc + "\";";
		str += "imageObject.angle = " + this.angle + ";\n";
		str += "imageObject.sizeX = " + this.sizeX + ";\n";
		str += "imageObject.sizeY = " + this.sizeY + ";\n";

		str += this.appearance.saveAsJavascript("imageObject");
		str += "imageObject.visible = " + this.visible + ";\n";
		str += "imageObject.frozen = " + this.frozen + ";\n";

		if (this.name != undefined)
		{
			str += "imageObject.name = \"" + this.name + "\";\n";
		}

		str += "imageObject.onChange();\n";

		str += "scene.addObject(imageObject);\n";
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
		
		lastImageAppearance = this.appearance.copy();

		this.points[0] = this.origin.copy();
		this.points[1] = mad(this.xAxis, this.sizeX, this.origin);
		this.points[2] = mad(this.xAxis, this.sizeX, mad(this.yAxis, this.sizeY, this.origin));
		this.points[3] = mad(this.yAxis, this.sizeY, this.origin);

		this.boundsMin = min(this.points[0], this.points[2]);
		this.boundsMax = max(this.points[0], this.points[2]);

		var currentSrc = this.img.src;

		this.img.src = this.imgSrc;
		this.img.crossOrigin = "anonymous";

		if (this.img.src != currentSrc && !this.imageReady)
		{
			this.imageReady = false;
			this.img.onload = function()
			{
				this.imageReady = true;

				this.onChange({dontBackup:true});

			}.bind(this);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		if (this.imageReady)
		{
			this.img.onload = undefined;

			var changed = false;

			if (this.sizeX == 0)
			{
				changed = true;
				this.sizeX = camera.invScale(this.img.naturalWidth);
			}

			if (this.sizeY == 0)
			{
				changed = true;
				this.sizeY = camera.invScale(this.img.naturalHeight);
			}

			if (changed)
				this.onChange();

			var angle = toAngle(this.xAxis);
			camera.drawImage(this.origin, this.img, this.sizeX, this.sizeY, angle, this.appearance.fillAlpha);

			if (this.appearance.lineAlpha>0)
			{
				camera.drawLineStrip(this.points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), undefined, this);
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

		// TODO: full quad hit test

		return false;
	}
	
	this.getSnapPoints = function()
	{
		return [
			{ type: "center", p: avg(this.points[0], this.points[2])},
			{ type: "node", p: this.points[0]},
			{ type: "node", p: this.points[1]},
			{ type: "node", p: this.points[2]},
			{ type: "node", p: this.points[3]},
			{ type: "midpoint", p: avg(this.points[0], this.points[1])},
			{ type: "midpoint", p: avg(this.points[1], this.points[2])},
			{ type: "midpoint", p: avg(this.points[2], this.points[3])},
			{ type: "midpoint", p: avg(this.points[3], this.points[0])},
		];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points =
		[
			avg(this.points[0], this.points[2]),
			this.points[0],
			this.points[1],
			this.points[2],
			this.points[3],
			avg(this.points[0], this.points[1]),
			avg(this.points[1], this.points[2]),
			avg(this.points[2], this.points[3]),
			avg(this.points[3], this.points[0]),
		];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		camera.drawRectangle(position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		// TODO: rotation

		if (index == 0)
		{
			this.origin = add(this.origin, sub(p, avg(this.points[0], this.points[2])));
		}
		else if (index<5)
		{
				 if (index == 1)		{	this.sizeX = -dot(this.xAxis, sub(p, this.points[2]));	this.sizeY = -dot(this.yAxis, sub(p, this.points[2]));	}
			else if (index == 2)		{	this.sizeX = dot(this.xAxis, sub(p, this.points[3]));	this.sizeY = -dot(this.yAxis, sub(p, this.points[3]));	}
			else if (index == 3)		{	this.sizeX = dot(this.xAxis, sub(p, this.points[0]));	this.sizeY = dot(this.yAxis, sub(p, this.points[0]));	}
			else if (index == 4)		{	this.sizeX = -dot(this.xAxis, sub(p, this.points[1]));	this.sizeY = dot(this.yAxis, sub(p, this.points[1]));	}

			if (localSpace)
			{
				var maxSize = Math.max(Math.abs(this.sizeX), Math.abs(this.sizeY));

				this.sizeX = Math.sign(this.sizeX) * maxSize;
				this.sizeY = Math.sign(this.sizeY) * maxSize;
			}

				 if (index == 1)		this.origin = mad(this.xAxis, -this.sizeX, mad(this.yAxis, -this.sizeY, this.points[2]));
			else if (index == 2)		this.origin = mad(this.yAxis, -this.sizeY, this.points[3]);
			else if (index == 4)		this.origin = mad(this.xAxis, -this.sizeX, this.points[1]);
		}
		else
		{
			if (index == 5)		{ this.sizeY = -dot(this.yAxis, sub(p, this.points[2]));	if (localSpace) this.sizeX = Math.sign(this.sizeX) * Math.abs(this.sizeY); }
			if (index == 7)		{ this.sizeY = dot(this.yAxis, sub(p, this.points[0]));		if (localSpace) this.sizeX = Math.sign(this.sizeX) * Math.abs(this.sizeY); }

			if (index == 6)		{ this.sizeX = dot(this.xAxis, sub(p, this.points[3]));		if (localSpace) this.sizeY = Math.sign(this.sizeY) * Math.abs(this.sizeX); }
			if (index == 8)		{ this.sizeX = -dot(this.xAxis, sub(p, this.points[1]));	if (localSpace) this.sizeY = Math.sign(this.sizeY) * Math.abs(this.sizeX); }

			if (index == 5)		this.origin = mad(this.yAxis, -this.sizeY, this.points[3]);
			if (index == 8)		this.origin = mad(this.xAxis, -this.sizeX, this.points[1]);
		}

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
					{ name: "Image URL", control:new TextBox(this.imgSrc, true, false, 256, function(value){ this.imgSrc = value; this.onChange(); }.bind(this) )},
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
