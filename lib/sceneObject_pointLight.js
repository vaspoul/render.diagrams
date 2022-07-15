// ----------------------------------------------------------------------------------------------------------------
// Point Light
// ----------------------------------------------------------------------------------------------------------------
function PointLight(O, radius)
{
	this.scene				= null;
	this.center				= O;
	this.bulbRadius			= 1;
	this.radius				= radius;
	this.collisionOutline	= true;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= new Appearance("#FFC000", 1, 2);
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
		var str = "var light = new PointLight(";

		str += "new Vector(" + this.center.x + ", " + this.center.y + ")";
		str += ", " + this.radius;
		str += ");\n";

		str += "light.bulbRadius = " + this.bulbRadius + ";\n";
		str += "light.collisionOutline = " + this.collisionOutline + ";\n";
		str += this.appearance.saveAsJavascript("light");
		str += "light.visible = " + this.visible + ";\n";
		str += "light.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(light);\n";
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

		this.boundsMin = sub(this.center, new Vector(this.radius, this.radius));
		this.boundsMax = add(this.center, new Vector(this.radius, this.radius));

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.draw = function(camera)
	{
		camera.drawStar(this.center, 7, this.bulbRadius, 0.5, 0, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,0.8)");
		camera.drawArc(this.center, this.bulbRadius*0.5, 0, Math.PI*2, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), "rgba(255,255,0,1)");

		if (this.collisionOutline)
		{
			this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
			this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

			var points = [];

			var angleStep = camera.invScale(20) / (2 * Math.PI * this.radius) * 360 * Math.PI / 180;

			for (var a=0; a<=Math.PI*2; a+=angleStep)
			{
				var dir = fromAngle(a);

				var bestHit = this.scene.rayHitTest(this.center, dir);

				if (bestHit.tRay<this.radius)
				{
					points.push(bestHit.P);
				}
				else
				{
					points.push(add(this.center, mul(dir, this.radius)));
				}

				this.boundsMin = min(this.boundsMin, points[points.length-1]);
				this.boundsMax = max(this.boundsMax, points[points.length-1]);
			}

			if (points.length>1)
			{
				camera.drawLineStrip(points, true, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
			}
		}
		else
		{
			camera.drawArc(this.center, this.radius, 0, Math.PI * 2, this.appearance.GetLineColor(), 1, "rgba(0,0,0,0)", undefined, this);
		}
	}
	
	this.hitTest = function(a, b, camera)
	{
		// Check bulb
		{
			var p = min(max(this.center, a), b);

			var d = sub(p, this.center).length();

			if (d<=this.bulbRadius)
				return true;
		}

		// Check outer radius
		var rectMin = min(a, b);
		var rectMax = max(a, b);
		var rectCenter = avg(a, b);

		if (	b.x>=this.center.x &&
				a.x<=this.center.x &&
				b.y>=this.center.y &&
				a.y<=this.center.y)
		{
			return true;
		}

		var p = add(this.center, mul(sub(rectCenter, this.center).unit(), this.radius));

		if (	p.x>rectMax.x ||
				p.x<rectMin.x ||
				p.y>rectMax.y ||
				p.y<rectMin.y)
		{
			return false;
		}

		return true;
	}
	
	this.getSnapPoints = function()
	{
		return [{ type: "node", p: this.center}];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.center];

		var angleStep = 5 * Math.PI / 180;

		for (var a=0; a<=Math.PI*2; a+=angleStep)
		{
			points.push(add(this.center, mul(fromAngle(a), this.radius)));
		}

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index==0)
		{
			camera.drawRectangle(this.center, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			var angleStep = 5 * Math.PI / 180;

			var p = add(this.center, mul(fromAngle((index - 1) * angleStep), this.radius));

			camera.drawRectangle(p, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index==0)
		{
			this.center = p;
		}
		else
		{
			this.radius = sub(p, this.center).length();
		}

		if (camera != undefined)
		{
			var textPoint = p.copy();
			textPoint.x += ((p.x < this.center.x) ? +1 : -1) * camera.invScale(10);
			textPoint.y += camera.invScale(10);

			camera.drawText(textPoint, "R: " + this.radius.toFixed(1), "#000000", (p.x < this.center.x) ? "left" : "right", 0, "12px Arial");
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
					{ name: "Appearance", control:appearanceControl },
					{ name: "Bulb Radius", control: new PopoutSlider(0, 5, this.bulbRadius, 0.1, function (value) { this.bulbRadius = value; this.onChange(); }.bind(this)) },
					{ name: "Outer Radius", control: new PopoutSlider(0, 100, this.radius, 1, function (value) { this.radius = value; this.onChange(); }.bind(this)) },
					{ name: "Collision Outline", control: new TickBox(this.collisionOutline, function (value) { this.collisionOutline = value; this.onChange(); }.bind(this)) }
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
