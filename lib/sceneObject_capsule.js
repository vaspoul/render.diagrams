// ----------------------------------------------------------------------------------------------------------------
// Capsule
// ----------------------------------------------------------------------------------------------------------------
var lastCapsuleAppearance = new Appearance("#900090", 1, 2);

function Capsule(p0, p1, radius)
{
	this.scene				= null;
	this.p0					= p0;
	this.p1					= p1;
	this.radius				= radius;
	this.drawCenters		= true;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.sideCount			= 30;
	this.appearance			= lastCapsuleAppearance.copy();
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
		var str = "var capsule = new Capsule(";

		str += "new Vector(" + this.p0.x + ", " + this.p0.y + ")" + ", ";
		str += "new Vector(" + this.p1.x + ", " + this.p1.y + ")" + ", ";
		str += this.radius;
		str += ");\n";

		str += "capsule.sideCount = " + this.sideCount + ";\n";
		str += "capsule.drawCenters = " + this.drawCenters + ";\n";
		str += this.appearance.saveAsJavascript("capsule");
		str += "capsule.visible = " + this.visible + ";\n";
		str += "capsule.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(capsule);\n";
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

		lastCapsuleAppearance = this.appearance.copy();

		this.boundsMin = sub(min(this.p0, this.p1), new Vector(this.radius, this.radius));
		this.boundsMax = add(max(this.p0, this.p1), new Vector(this.radius, this.radius));

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}
	
	this.draw = function(camera)
	{
		var dir = sub(this.p1, this.p0).unit();
		var tan = transpose(dir);

		if (this.sideCount>=30)
		{
			var startAngle = toAngle(tan.neg());
			var endAngle = startAngle + Math.PI;

			camera.drawArc(this.p0, this.radius, startAngle, endAngle, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetFillColor(), this.appearance.GetLineDash(), false, false, this);

			if (this.appearance.GetFillColor() != undefined)
			{
				var points = [];
				points.push(mad(tan, this.radius, this.p0));
				points.push(mad(tan, this.radius, this.p1));
				points.push(mad(tan, -this.radius, this.p1));
				points.push(mad(tan, -this.radius, this.p0));

				camera.drawLineStrip(points, true, undefined, 0, undefined, this.appearance.GetFillColor(), this);
			}

			camera.drawLine(mad(tan, this.radius, this.p0), mad(tan, this.radius, this.p1), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash());
			camera.drawLine(mad(tan, -this.radius, this.p0), mad(tan, -this.radius, this.p1), this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash());

			camera.drawArc(this.p1, this.radius, endAngle, startAngle, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetFillColor(), this.appearance.GetLineDash(), false, false, this);
		}
		else
		{
			var points = [];

			var angleStep = Math.PI / this.sideCount;

			for (var ai = 0; ai <= this.sideCount; ++ai)
			{
				var a = ai * angleStep;

				points.push(mad(mad(Math.cos(a), tan, mul(Math.sin(a), dir.neg())), this.radius, this.p0));
			}

			for (var ai = this.sideCount; ai >= 0; --ai)
			{
				var a = ai * angleStep;

				points.push(mad(mad(Math.cos(a), tan, mul(Math.sin(a), dir)), this.radius, this.p1));
			}

			camera.drawLineStrip(points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetLineDash(), this.appearance.GetFillColor(), this);
		}

		if (this.drawCenters)
		{
			camera.drawCross(this.p0, camera.invScale(5), 0, "#808080", 2);
			camera.drawCross(this.p1, camera.invScale(5), 0, "#808080", 2);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		var rectCenter = avg(a, b);

		var dir = sub(this.p1, this.p0).unit();
		var tan = transpose(dir);

		if (overlapRectLine(a, b, mad(tan, this.radius, this.p0), mad(tan, this.radius, this.p1)))
			return true;

		if (overlapRectLine(a, b, mad(tan, -this.radius, this.p0), mad(tan, -this.radius, this.p1)))
			return true;

		var c;

		if (dot(sub(rectCenter, this.p1), dir) >= 0)
		{
			c = this.p1;
		}
		else
		{
			c = this.p0;
		}

		var p = mad(sub(rectCenter, c).unit(), this.radius, c);

		if (overlapRectPoint(a,b,p))
			return true;

		return false;
	}

	this.getSnapPoints = function ()
	{
		var points = [	{ type: "center", p: avg(this.p0, this.p1) },
						{ type: "node", p: this.p0 },
						{ type: "node", p: this.p1 },
					];

		var count = (this.sideCount>=30) ? 12 : this.sideCount;

		var angleStep = Math.PI / count;

		var dir = sub(this.p1, this.p0).unit();
		var tan = transpose(dir);

		points.push( { type:"node", p: mad(tan, this.radius, avg(this.p0, this.p1)) } );
		points.push( { type:"node", p: mad(tan, -this.radius, avg(this.p0, this.p1)) } );

		for (var ai = 0; ai <= count; ++ai)
		{
			var a = ai * angleStep;

			var p = mad(mad(Math.cos(a), tan, mul(Math.sin(a), dir.neg())), this.radius, this.p0);
			
			points.push( { type:"node", p: p.copy() } );
		}

		for (var ai = 0; ai <= count; ++ai)
		{
			var a = ai * angleStep;

			var p = mad(mad(Math.cos(a), tan, mul(Math.sin(a), dir)), this.radius, this.p1);

			points.push( { type:"node", p: p.copy() } );
		}

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [];

		points.push(this.p0);
		points.push(this.p1);

		var dir = sub(this.p1, this.p0).unit();
		var tan = transpose(dir);

		points.push(mad(dir.neg(), this.radius, this.p0));
		points.push(mad(dir, this.radius, this.p1));

		var count = (this.sideCount>=30) ? 12 : this.sideCount;

		var angleStep = Math.PI / count;


		for (var ai = 0; ai <= count; ++ai)
		{
			var a = ai * angleStep;

			points.push( mad(mad(Math.cos(a), tan, mul(Math.sin(a), dir.neg())), this.radius, this.p0) );
		}

		for (var ai = 0; ai <= count; ++ai)
		{
			var a = ai * angleStep;

			points.push( mad(mad(Math.cos(a), tan, mul(Math.sin(a), dir)), this.radius, this.p1) );
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		camera.drawRectangle( position, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index == 0 || index == 1)
		{
			var center = avg(this.p0, this.p1);

			if (index == 0)	this.p0 = p;
			else			this.p1 = p;

			if (localSpace)
			{
				if (index == 0)		this.p1 = add(center, sub(center, this.p0));
				else				this.p0 = add(center, sub(center, this.p1));

				if (camera != undefined)
				{
					camera.drawLine(this.p0, this.p1,"#0084e0", 2, [5, 5]);
					camera.drawCross(center, camera.invScale(10), 45 * Math.PI/180, "#0084e0", 2);
				}
			}
		}
		else
		{
			var center = (distance(p, this.p0) < distance(p, this.p1)) ? this.p0 : this.p1;

			this.radius = sub(p, center).length();

			if (camera != undefined)
			{
				var textPoint = p.copy();
				textPoint.x += ((p.x < center.x) ? +1 : -1) * camera.invScale(10);
				textPoint.y += camera.invScale(10);

				camera.drawText(textPoint, "R: " + this.radius.toFixed(1), "#000000", (p.x < center.x) ? "left" : "right", 0, "12px Arial");
			}
		}

		this.onChange();
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
			appearanceControl.addControl("", new AppearanceControl(this.appearance, true, true, function(){ this.onChange(); }.bind(this)) );
		}

		return	[
					{name: "Appearance", control:appearanceControl },
					{name: "Sides", control: new PopoutSlider(2, 30, this.sideCount, 1, function (value) { this.sideCount = value; this.onChange(); }.bind(this)) },
					{name: "Center Points", control: new TickBox(this.drawCenters, function (value) { this.drawCenters = value; this.onChange(); }.bind(this)) }
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
