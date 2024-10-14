// ----------------------------------------------------------------------------------------------------------------
// BRDF Ray
// ----------------------------------------------------------------------------------------------------------------
var lastBRDFAppearance = new Appearance("#000000", 1, 2);

function BRDFRay(O, dir)
{
	this.scene				= null;
	this.O					= O;
	this.dir				= dir;
	this.selected			= false;
	this.visible			= true;
	this.frozen				= false;
	this.appearance			= lastBRDFAppearance.copy();
	this.intensity			= 1;
	this.bounceCount		= 3;
	this.showBRDF			= true;
	this.originIsLight		= 1;
	this.onChangeListeners	= [];
	this.intersectionPoints = [];
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
		var str = "var ray = new BRDFRay(";

		str += "new Vector(" + this.O.x + ", " + this.O.y + ")";
		str += ", new Vector(" + this.dir.x + ", " + this.dir.y + ")";
		str += ");\n";

		str += "ray.showBRDF = " + this.showBRDF + ";\n";
		str += "ray.originIsLight = " + this.originIsLight + ";\n";
		str += "ray.bounceCount = " + this.bounceCount + ";\n";
		str += this.appearance.saveAsJavascript("ray");
		str += "ray.intensity = " + this.intensity + ";\n";
		str += "ray.visible = " + this.visible + ";\n";
		str += "ray.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(ray);\n";
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

		lastBRDFAppearance = this.appearance.copy();

		this.doRayCasting();

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		this.boundsMin = min(this.boundsMin, this.O);
		this.boundsMax = max(this.boundsMax, this.O);

		for (var i = 0; i != this.intersectionPoints.length; ++i)
		{
			this.boundsMin = min(this.boundsMin, this.intersectionPoints[i].P);
			this.boundsMax = max(this.boundsMax, this.intersectionPoints[i].P);
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.doRayCasting = function()
	{
		this.intersectionPoints = [];

		if (this.scene == undefined)
			return;

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		this.boundsMin = min(this.boundsMin, this.O);
		this.boundsMax = max(this.boundsMax, this.O);

		var rays = [{ start: this.O, dir: this.dir.unit() }];

		for (var r=0; r<rays.length; ++r)
		{
			var ray = rays[r];
			
			var bestHit = this.scene.rayHitTest(ray.start, ray.dir);

			if (bestHit.tRay<1000)
			{
				if (bestHit.metalness == undefined) 
					bestHit.metalness = 0.04;

				if (bestHit.roughness == undefined) 
					bestHit.roughness = 0;

				this.intersectionPoints.push(bestHit);

				var newRay = { start:0, dir:0 };
				newRay.start = bestHit.P;
				
				if (bestHit.outDir != undefined)
					newRay.dir = bestHit.outDir;
				else
					newRay.dir = reflect(ray.dir, bestHit.N);

				rays.push(newRay);
			}
			
			if (rays.length>this.bounceCount+1)
			{
				break;
			}
		}
	}

	this.draw = function(camera)
	{
		var rays = [{ start: this.O, dir: this.dir.unit(), level:0, color:this.appearance.GetLineColor(), intensity:this.intensity }];

		this.intersectionPoints = [];

		this.boundsMin = new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
		this.boundsMax = new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

		this.boundsMin = min(this.boundsMin, this.O);
		this.boundsMax = max(this.boundsMax, this.O);

		for (var r=0; r<rays.length; ++r)
		{
			var ray = rays[r];
			
			var bestHit = this.scene.rayHitTest(ray.start, ray.dir);

			if (bestHit.tRay<1000)
			{
				var BRDF = bestHit.BRDF;

				if (r==0)
				{
					// Don't draw over the arrow because it breaks AA
					var t = Math.min(1, distance(bestHit.P, ray.start)/this.dir.length());
					camera.drawLine(mad(this.dir, t, ray.start), bestHit.P, this.appearance.GetLineColor(), 2, [5,5], this);
				}
				else
				{
					camera.drawLine(ray.start, bestHit.P, this.appearance.GetLineColor(), 2, [5,5], this);
				}

				if (this.showBRDF)
				{
					var F0 = 0.04 + bestHit.metalness * (1 - 0.04);
					camera.drawBRDFGraph(BRDF, ray.dir.unit().neg(), bestHit.N, F0, this.originIsLight, bestHit.roughness, bestHit.P, bestHit.intensity * ray.intensity);
				}

				this.intersectionPoints.push(bestHit);

				this.boundsMin = min(this.boundsMin, this.intersectionPoints[this.intersectionPoints.length-1].P);
				this.boundsMax = max(this.boundsMax, this.intersectionPoints[this.intersectionPoints.length-1].P);

				var newRay = {};
				newRay.start = bestHit.P;

				if (bestHit.outDir != undefined)
					newRay.dir = bestHit.outDir;
				else
					newRay.dir = reflect(ray.dir, bestHit.N);

				newRay.intensity = bestHit.intensity * ray.intensity;
				newRay.level = ray.level+1;
				rays.push(newRay);
			}
			
			if (rays.length>this.bounceCount+1)
			{
				break;
			}
		}

		camera.drawArrow(this.O, add(this.O, this.dir), 20, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected));
	}
	
	this.hitTest = function(a, b, camera)
	{
		return overlapRectLine(a,b,this.O, add(this.O, this.dir));
	}
	
	this.getSnapPoints = function()
	{
		var points = []

		for (var i = 0; i != this.intersectionPoints.length; ++i)
		{
			points.push( { type: "intersection", p: this.intersectionPoints[i].P } );
		}

		points.push({ type: "node", p: this.O});

		return points;
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		return [this.O, add(this.O, this.dir)];
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index==0)
		{
			camera.drawRectangle(this.O, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
		else
		{
			if (localSpace)
			{
				var delta = mul(this.dir.unit(), camera.invScale(30));

				camera.drawArrow(add(this.O, this.dir), add(add(this.O, this.dir), delta), 8, "rgba(255,0,0," + alpha + ")", 4);
			}
			else
			{
				camera.drawRectangle(add(this.O, this.dir), camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
			}
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index==0)
		{
			var pointB = add(this.O, this.dir);

			this.dir = sub(pointB, p)
			this.O = p;
		}
		else if (index==1)
		{
			if (localSpace)
			{
				var L = this.dir.unit();
				this.dir = mul(dot(sub(p, this.O), L), L);
			}
			else
			{
				this.dir = sub(p, this.O);
			}
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.O;
	}
	
	this.setOrigin = function(p)
	{
		this.O = p;

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
					{name: "Intensity", control:new PopoutSlider(0, 10, this.intensity, 0.1, function(value){ this.intensity = value; this.onChange(); }.bind(this) )},
					{name: "Bounce Count", control:new PopoutSlider(0, 20, this.bounceCount, 1, function(value){ this.bounceCount = value; this.onChange(); }.bind(this) )},
					{name: "Show BRDF", control: new TickBox(this.showBRDF, function (value) { this.showBRDF = value; this.onChange(); }.bind(this)) },
					{name: "Origin", control: new Dropdown(["Camera", "Light"], this.originIsLight, function (value) { this.originIsLight = value; this.onChange(); }.bind(this)) },
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
