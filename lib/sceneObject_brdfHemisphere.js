// ----------------------------------------------------------------------------------------------------------------
// BRDFHemisphere
// ----------------------------------------------------------------------------------------------------------------
function BRDFHemisphere(centerPos, radius, normal)
{
	this.scene				= null;
	this.center				= centerPos;
	this.normal				= normal;
	this.radius				= radius;
	this.BRDF				= Phong;
	this.BRDFIndex			= 1;
	this.BRDFOptions		= [ Lambert, Phong, ConstantHemi ];
	this.metalness			= 0;
	this.roughness			= 0;
	this.intensity			= 1;
	this.showBRDF			= true;
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
		var str = "var hemi = new BRDFHemisphere(";

		str += "new Vector(" + this.center.x + ", " + this.center.y + ")";
		str += ", " + this.radius;
		str += ", new Vector(" + this.normal.x + ", " + this.normal.y + ")";
		str += ");\n";

		str += this.appearance.saveAsJavascript("hemi");
		str += "hemi.visible = " + this.visible + ";\n";
		str += "hemi.frozen = " + this.frozen + ";\n";
		str += "hemi.showBRDF = " + this.showBRDF + ";\n";
		str += "hemi.metalness = " + this.metalness + ";\n";
		str += "hemi.roughness = " + this.roughness + ";\n";
		str += "hemi.intensity = " + this.intensity + ";\n";
		str += "hemi.BRDFIndex = " + this.BRDFIndex + ";\n";
		
		if (this.name != undefined)
		{
			str += "hemi.name = \"" + this.name + "\";\n";
		}

		str += "hemi.onChange();\n";

		str += "scene.addObject(hemi);\n";
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

		this.BRDF = this.BRDFOptions[this.BRDFIndex];

		this.startAngle = toAngle(this.normal) - Math.PI/2;
		this.endAngle = toAngle(this.normal) + Math.PI/2;

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		var p0 = add(this.center, mul(fromAngle(this.startAngle), this.radius));
		var p1 = add(this.center, mul(fromAngle(this.endAngle), this.radius));

		this.boundsMin = min(this.boundsMin, p0);
		this.boundsMin = min(this.boundsMin, p1);
		this.boundsMax = max(this.boundsMax, p0);
		this.boundsMax = max(this.boundsMax, p1);

		var a90 = Math.ceil(this.startAngle/(Math.PI/2)) * Math.PI/2;
		for (var a = a90; a <= this.endAngle; a += Math.PI/2)
		{
			var p = add(this.center, mul(fromAngle(a), this.radius));
			this.boundsMin = min(this.boundsMin, p);
			this.boundsMax = max(this.boundsMax, p);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		if (this.radius <= 0)
			return;

		if (this.showBRDF)
		{
			var F0 = 0.04 + this.metalness * (1 - 0.04);
			camera.drawBRDFGraph(this.BRDF, this.normal, this.normal, F0, false, this.roughness, this.center, this.intensity);
		}

		camera.drawArc(this.center, this.radius, this.startAngle, this.endAngle, "#F08000", this.appearance.GetLineWidth(this.selected));
		camera.drawArrow(this.center, mad(this.normal, this.radius * 0.5, this.center), 20, "#000000", this.appearance.GetLineWidth(this.selected));
		camera.drawText(mad(this.normal, this.radius * 0.5, this.center), "N", "#000000");
	}
	
	this.hitTest = function(a, b, camera)
	{
		var rectMin = min(a, b);
		var rectMax = max(a, b);
		var rectCenter = avg(a, b);

		var p = add(this.center, mul(sub(rectCenter, this.center).unit(), this.radius));

		if (	p.x>rectMax.x ||
				p.x<rectMin.x ||
				p.y>rectMax.y ||
				p.y<rectMin.y)
		{
			return false;
		}

		var a = toAngle(sub(new Vector(rectMin.x, rectMin.y), this.center));
		if (a >= this.startAngle && a <= this.endAngle)
			return true;
		
		var a = toAngle(sub(new Vector(rectMin.x, rectMax.y), this.center));
		if (a >= this.startAngle && a <= this.endAngle)
			return true;

		var a = toAngle(sub(new Vector(rectMax.x, rectMin.y), this.center));
		if (a >= this.startAngle && a <= this.endAngle)
			return true;

		var a = toAngle(sub(new Vector(rectMax.x, rectMax.y), this.center));
		if (a >= this.startAngle && a <= this.endAngle)
			return true;

		return false;
	}

	this.getSnapPoints = function ()
	{
		var v0 = add(this.center, rotate(new Vector(this.radius,0), this.startAngle));
		var v1 = add(this.center, rotate(new Vector(this.radius,0), this.endAngle));

		var points = [	{ type: "center", p: this.center },
						{ type: "node", p: v0 },
						{ type: "node", p: v1 } ];

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var v0 = add(this.center, rotate(new Vector(this.radius,0), this.startAngle));
		var v1 = add(this.center, rotate(new Vector(this.radius,0), this.endAngle));

		var points = [ this.center, v0, v1 ];

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
			this.center = p;
		}
		else if (index == 1 || index == 2)
		{
			this.radius = sub(p, this.center).length();
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.center;
	}
	
	this.setOrigin = function(p)
	{
		this.center = p;
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
					{name: "Show BRDF", control: new TickBox(this.showBRDF, function (value) { this.showBRDF = value; this.onChange(); }.bind(this)) },
					{name: "Roughness", control: new PopoutSlider(0, 1, this.roughness, 0.1, function (value) { this.roughness = value; this.onChange(); }.bind(this)) },
					{name: "Metalness", control: new PopoutSlider(0, 1, this.metalness, 0.1, function (value) { this.metalness = value; this.onChange(); }.bind(this)) },
					{name: "Intensity", control: new PopoutSlider(0, 10, this.intensity, 0.1, function (value) { this.intensity = value; this.onChange(); }.bind(this)) },
					{name: "BRDF", control: new Dropdown(["Lambert", "Phong", "Constant"], this.BRDFIndex, function (value) { this.BRDFIndex = value; this.onChange(); }.bind(this)) },
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
