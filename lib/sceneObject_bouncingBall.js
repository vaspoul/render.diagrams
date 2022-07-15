// ----------------------------------------------------------------------------------------------------------------
// BouncingBall
// ----------------------------------------------------------------------------------------------------------------
function BouncingBall(position)
{
	this.scene					= null;
	this.position				= position;
	this.radius					= 0.5;
	this.density				= 1;
	this.mass					= 1;
	this.bounceFactor			= 0.8;
	this.wrapAround				= true;
	this.applyGravity			= true;
	this.currentPosition		= position;
	this.currentVelocity		= new Vector(0,0);
	this.currentAcceleration	= new Vector(0,0);
	this.currentForce			= new Vector(0,0);
	this.impactPoint			= undefined;
	this.showImpactPoint		= false;
	this.externalDragActive		= false;
	this.externalDragVelocity	= new Vector(0,0);
	this.externalDragLastPos	= new Vector(0,0);
	this.externalDragLastTime	= 0;
	this.externalDragTimer		= undefined;
	this.selected				= false;
	this.visible				= true;
	this.frozen					= false;
	this.appearance				= new Appearance("#000000", 1, 2, "#FF0000", 0.5);
	this.onChangeListeners		= [];
	this.boundsMin				= new Vector(Number.MAX_VALUE,Number.MAX_VALUE);
	this.boundsMax				= new Vector(-Number.MAX_VALUE,-Number.MAX_VALUE);

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
		var str = "var bouncingBall = new BouncingBall(";

		str += "new Vector(" + this.position.x + ", " + this.position.y + ")";
		str += ");\n";

		str += "bouncingBall.radius = " + this.radius + ";\n";
		str += "bouncingBall.density = " + this.density + ";\n";
		str += "bouncingBall.bounceFactor = " + this.bounceFactor + ";\n";
		str += "bouncingBall.wrapAround = " + this.wrapAround + ";\n";
		str += "bouncingBall.applyGravity = " + this.applyGravity + ";\n";
		str += "bouncingBall.showImpactPoint = " + this.showImpactPoint + ";\n";
		str += this.appearance.saveAsJavascript("bouncingBall");
		str += "bouncingBall.visible = " + this.visible + ";\n";
		str += "bouncingBall.frozen = " + this.frozen + ";\n";

		str += "scene.addObject(bouncingBall);\n";
		return str;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.updateBounds = function()
	{
		this.boundsMin = new Vector(this.currentPosition.x - this.radius, this.currentPosition.y - this.radius);
		this.boundsMax = new Vector(this.currentPosition.x + this.radius, this.currentPosition.y + this.radius);
	}

	this.onChange = function(changeDetails)
	{
		// Backwards compatibility
		this.appearance.SetFromOldProperties(this);

		this.updateBounds();

		for (var i = 0; i != this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}

		this.mass = this.density * 4.0 / 3.0 * Math.PI * Math.pow(this.radius, 3);
	}

	this.onFrameTick = function(deltaTime_ms)
	{
		if (this.externalDragActive)
			return false;

		this.currentAcceleration = div(this.currentForce, this.mass);

		if (this.applyGravity)
		{
			this.currentAcceleration.y += -9.81;
		}
		this.currentVelocity = add(this.currentVelocity, mul(this.currentAcceleration, deltaTime_ms / 1000));

		this.currentVelocity = clamp(this.currentVelocity, -100, 100);

		if (this.currentVelocity.lengthSqr()>0)
		{
			var positionDelta = mul(this.currentVelocity, deltaTime_ms / 1000);

			// Collision check
			this.impactPoint = this.scene.rayHitTest(this.currentPosition, this.currentVelocity.unit(), this.radius);

			var impactFraction = saturate(this.impactPoint.tRay / length(positionDelta));

			// Are we going to hit something before the movement is done?
			if (this.impactPoint.hit && impactFraction<1)
			{
				this.currentPosition = add(this.currentPosition, mul(this.currentVelocity.unit(), this.impactPoint.tRay));
				this.currentVelocity = mul(reflect(this.currentVelocity, this.impactPoint.N), this.bounceFactor);

				// move the remainder of the delta with the new velocity (otherwise the ball 'sticks' on inclines due to penetration)
				positionDelta = mul(this.currentVelocity, (1-impactFraction) * deltaTime_ms / 1000);
			}

			this.currentPosition = add(this.currentPosition, positionDelta);

			//this.onChange();
			this.updateBounds();

			return true;
		}

		return false;
	}

	this.rayHitTest = function(rayPos, rayDir, rayRadius)
	{
		var results = [{N:rayDir, P:rayPos, hit:false, tRay:0}];

		// TODO

		return results;
	}

	this.draw = function(camera)
	{
		if (this.wrapAround)
		{
			var changed = false;

			if (this.currentPosition.x < (camera.getViewPosition().x - camera.getViewSize().x/2))
			{
				this.currentPosition.x = (camera.getViewPosition().x + camera.getViewSize().x/2)
				changed = true;
			}
			else if (this.currentPosition.x > (camera.getViewPosition().x + camera.getViewSize().x/2))
			{
				this.currentPosition.x = (camera.getViewPosition().x - camera.getViewSize().x/2)
				changed = true;
			}

			if (this.currentPosition.y < (camera.getViewPosition().y - camera.getViewSize().y/2))
			{
				this.currentPosition.y = (camera.getViewPosition().y + camera.getViewSize().y/2)
				changed = true;
			}
			else if (this.currentPosition.y > (camera.getViewPosition().y + camera.getViewSize().y/2))
			{
				this.currentPosition.y = (camera.getViewPosition().y - camera.getViewSize().y/2)
				changed = true;
			}

			if (changed)
			{
				this.onChange();
			}
		}

		camera.drawArc(this.currentPosition, this.radius, 0, 2*Math.PI, this.appearance.GetLineColor(), this.appearance.GetLineWidth(this.selected), this.appearance.GetFillColor(), this.appearance.GetLineDash());

		if (this.showImpactPoint && this.impactPoint != undefined && this.impactPoint.hit)
		{
			camera.drawArrow(this.currentPosition, this.impactPoint.P, 8, "#FF0000", 2);
		}
	}	

	this.dragStart = function(p)
	{
		this.externalDragActive		= true;
		this.externalDragVelocity	= new Vector(0,0);
		this.externalDragLastPos	= new Vector(0,0);
		this.externalDragLastTime	= 0;
		this.externalDragTimer		= setInterval( function() { this.updateDragVelocity(); }.bind(this), 16);
	}

	this.dragStop = function()
	{
		clearInterval(this.externalDragTimer);
		this.externalDragTimer = undefined;

		this.currentVelocity = this.externalDragVelocity;

		this.externalDragActive		= false;
		this.externalDragVelocity	= new Vector(0,0);
		this.externalDragLastPos	= new Vector(0,0);
		this.externalDragLastTime	= 0;
	}

	this.updateDragVelocity = function()
	{
		if (this.externalDragActive)
		{
			if (this.externalDragLastTime == 0)
			{
				this.externalDragLastTime = performance.now();
				this.externalDragLastPos = this.currentPosition;
			}
			else
			{
				var currentTime = performance.now();
				var deltaTime = currentTime - this.externalDragLastTime;

				var deltaPos = sub(this.currentPosition, this.externalDragLastPos);

				var decay = 0.1;
				this.externalDragVelocity = lerp(mul(this.externalDragVelocity, decay), div( deltaPos, deltaTime / 1000), 1-decay);

				this.externalDragLastPos = this.currentPosition;
				this.externalDragLastTime = currentTime;
			}
		}
	}

	this.hitTest = function(a, b, camera)
	{
		var p = clamp(this.currentPosition, a, b);

		var d = distance(p, this.currentPosition);

		return (d <= this.radius);
	}

	this.getSnapPoints = function()
	{
		return [{ type: "node", p: this.currentPosition}];
	}

	this.getDragPoints = function(localSpace, camera)
	{
		if (this.isFrozen())
			return [];

		var points = [this.currentPosition];

		return points;
	}

	this.drawDragPoint = function(camera, index, position, localSpace, alpha)
	{
		if (alpha == undefined)
			alpha = 1;

		if (index==0)
		{
			camera.drawRectangle(this.currentPosition, camera.invScale(10), "rgba(255,0,0," + alpha + ")", 2);
		}
	}

	this.setDragPointPos = function(index, p, localSpace, dragStartPoint, camera)
	{
		if (index==0)
		{
			//this.setOrigin(p);
		}

		if (this.externalDragTimer != undefined)
		{
			clearInterval(this.externalDragTimer);
			this.externalDragTimer = undefined;
		}

		if (camera != undefined)
		{
			var L = sub(p, dragStartPoint);
			var Lmag = L.length();

			var w = lerp(0, 10, saturate(Lmag/15));

			this.externalDragVelocity = mul(L.unit(), lerp(0, 150, saturate(Lmag/15)));

			camera.drawArrow(dragStartPoint, lerp(dragStartPoint, p, saturate(15/Lmag)), 8, "#FF0000", w);
		}

		this.onChange();
	}

	this.getOrigin = function()
	{
		return this.currentPosition;
	}
	
	this.setOrigin = function(p)
	{
		this.position = p;
		this.currentPosition = p;

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
					{ name: "Radius", control: new PopoutSlider(0, 5, this.radius, 0.1, function (value) { this.radius = value; this.onChange(); }.bind(this)) },
					{ name: "Bounce Factor", control: new PopoutSlider(0, 1, this.bounceFactor, 0.1, function (value) { this.bounceFactor = value; this.onChange(); }.bind(this)) },
					{ name: "Apply Gravity", control: new TickBox(this.applyGravity, function (value) { this.applyGravity = value; this.onChange(); }.bind(this)) },
					{ name: "Show Impact Point", control: new TickBox(this.showImpactPoint, function (value) { this.showImpactPoint = value; this.onChange(); }.bind(this)) },
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
