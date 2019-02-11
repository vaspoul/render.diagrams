function Scene()
{
	this.objects			= [];
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(100000,100000);
	this.boundsMax			= new Vector(-100000,-100000);
	this.name				= "Unnamed Scene";
	this.needsFrameTick		= false;

	this.getBoundsMin = function()
	{
		return this.boundsMin;
	}

	this.getBoundsMax = function()
	{
		return this.boundsMax;
	}

	this.addChangeListener = function(listener)
	{
		this.onChangeListeners.push(listener);
	}

	this.onChange = function(caller, changeDetails)
	{
		this.boundsMin = new Vector(100000,100000);
		this.boundsMax = new Vector(-100000,-100000);

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getBoundsMin !== undefined)
			{
				this.boundsMin = min(this.boundsMin, this.objects[i].getBoundsMin());
				this.boundsMax = max(this.boundsMax, this.objects[i].getBoundsMax());
			}
		}

		for (var i=0; i!=this.onChangeListeners.length; ++i)
		{
			this.onChangeListeners[i](this, changeDetails);
		}
	}

	this.addObject = function (object, index)
	{
		if (index == undefined)
		{
			this.objects.push(object);
		}
		else
		{
			this.objects.splice(index, 0, object);
		}

		if (object.scene !== null && object.scene !== this)
		{
			object.scene.deleteObjects([object]);
		}

		object.scene = this;

		if (object.addChangeListener !== undefined)
		{
			object.addChangeListener(this.onChange.bind(this));
		}

		if (object.onChange !== undefined)
		{
			object.onChange();
		}

		if (object.onFrameTick != undefined)
		{
			this.needsFrameTick = true;
		}

		this.onChange();
	}
	
	this.deleteObjects = function(objectList)
	{
		for (var i=0; i<this.objects.length; ++i)
		{
			if (objectList.indexOf(this.objects[i])>=0)
			{
				if (this.objects[i].scene !== null)
				{
					this.objects[i].scene = null;
				}

				this.objects.splice(i, 1);
				--i;
			}
		}

		this.needsFrameTick = false;

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].onFrameTick != undefined)
			{
				this.needsFrameTick = true;
				break;
			}
		}

		this.onChange();
	}

	this.deleteAllObjects = function()
	{
		this.objects = [];
		this.needsFrameTick = false;
		this.onChange();
	}

	this.getObjectIndex = function (object)
	{
		return this.objects.indexOf(object);
	}

	this.setObjectIndex = function (object, index, relative)
	{
		var objectIndex = this.objects.indexOf(object);

		if (objectIndex<0)
			return;

		var newIndex = index;

		if (relative == true)
			newIndex = objectIndex + index;

		this.objects.splice(objectIndex, 1);
		this.objects.splice(newIndex, 0, object);

		this.onChange();
	}

	this.draw = function (camera, mousePos)
	{
		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].isVisible != undefined && this.objects[i].isVisible())
			{
				this.objects[i].draw(camera, mousePos);
			}
		}
	}
	
	this.onFrameTick = function(deltaTime_ms)
	{
		if (deltaTime_ms == undefined)
		{
			deltaTime_ms = 30;
		}
		else
		{
			deltaTime_ms = Math.min(30, deltaTime_ms);
		}

		var redrawNeeded = false;

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].onFrameTick != undefined && !this.objects[i].isFrozen())
			{
				redrawNeeded |= this.objects[i].onFrameTick(deltaTime_ms);
			}
		}

		return redrawNeeded;
	}

	this.hitTest = function(a, b, camera)
	{
		var results = [];
		
		for (var i=0; i<this.objects.length; ++i)
		{
			var temp = this.objects[i].hitTest;
			
			if (!this.objects[i].isFrozen()&& this.objects[i].isVisible() && this.objects[i].hitTest !== undefined)
			{
				if (this.objects[i].hitTest(a,b, camera) == true)
				{
					results.push(this.objects[i]);
				}
			}
		}
		
		return results;
	}

	this.rayHitTest = function(rayPos, rayDir, rayRadius)
	{
		if (rayRadius == undefined || rayRadius<0)
			rayRadius = 0;

		var bestHit = {tRay:1000};
			
		for (var o=0; o<this.objects.length; ++o)
		{
			if (this.objects[o].rayHitTest === undefined)
				continue;

			if (!overlapRayRect(rayPos, rayDir, this.objects[o].getBoundsMin(), this.objects[o].getBoundsMax(), rayRadius))
				continue;

			var hits = this.objects[o].rayHitTest(rayPos, rayDir, rayRadius);
				
			for (var h = 0; h != hits.length; ++h)
			{
				if (hits[h].hit && hits[h].tRay<bestHit.tRay)
				{
					bestHit = hits[h];
				}
			}
		}

		return bestHit;
	}

	this.getSnapPoint = function(mousePos, extraSnapPoints, threshold, ignoreObjectList, enabledTypes)
	{
		var bestPoint = null;
		var bestDistance = 1000;

		if (ignoreObjectList == undefined)
			ignoreObjectList = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getSnapPoints === undefined)
				continue;

			if (!this.objects[i].isVisible())
				continue;

			if (ignoreObjectList.indexOf(this.objects[i]) >= 0)
				continue;

			var points = this.objects[i].getSnapPoints();

			if (points.length == 0)
				continue;

			for (var p=0; p<points.length; ++p)
			{
				if (enabledTypes[points[p].type] === false)
					continue;

				var d = length(sub(points[p].p, mousePos));

				if (d<threshold && d<bestDistance)
				{
					bestDistance = d;
					bestPoint = {type: points[p].type, p:points[p].p, N:points[p].N, object: this.objects[i]};
				}
			}
		}

		for (var p=0; p<extraSnapPoints.length; ++p)
		{
			if (enabledTypes[extraSnapPoints[p].type] === false)
				continue;

			var skip = false;

			for (var o = 0; o < extraSnapPoints[p].objects.length; ++o)
			{
				if (ignoreObjectList.indexOf(extraSnapPoints[p].objects[o]) >= 0)
				{
					skip = true;
					break;
				}
			}

			if (skip)
				continue;

			var d;

			if (extraSnapPoints[p].testP !== undefined)
			{
				d = length(sub(extraSnapPoints[p].testP, mousePos));
			}
			else
			{
				d = length(sub(extraSnapPoints[p].p, mousePos));
			}

			if (d<threshold && d<bestDistance)
			{
				bestDistance = d;
				bestPoint = extraSnapPoints[p];//{type: extraSnapPoints[p].type, p:extraSnapPoints[p].p, N:extraSnapPoints[p].N};
			}
		}

		return bestPoint;
	}

	this.getDragPoint = function(mousePos, camera, localSpace, ignoreObjectList, proximityList)
	{
		var bestPoint = null;
		var bestObject = null;
		var bestIndex = null;
		var bestDistance = 1000;

		var threshold = camera.invScale(30);
		var proximityThreshold = camera.invScale(200);

		if (ignoreObjectList == undefined)
			ignoreObjectList = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getDragPoints === undefined)
				continue;

			if (!this.objects[i].isVisible())
				continue;

			if (ignoreObjectList.indexOf(this.objects[i]) >= 0)
				continue;

			var points = this.objects[i].getDragPoints(localSpace, camera);

			if (points.length == 0)
				continue;

			for (var p=0; p<points.length; ++p)
			{
				var d = length(sub(points[p], mousePos));

				if (d<threshold && d<bestDistance)
				{
					bestDistance = d;
					bestPoint = points[p].copy();
					bestObject = this.objects[i];
					bestIndex = p;
				}

				if (proximityList != undefined && d<proximityThreshold)
				{
					proximityList.push({object: this.objects[i], index:p, point: points[p].copy(), local: localSpace, distance:d });
				}
			}
		}

		if (proximityList != undefined)
		{
			proximityList.sort(function(a,b) { return a.distance - b.distance; });
			var filtered = proximityList.filter(function(item, pos) { return pos == 0 || !equal(item.point, proximityList[pos-1].point); });

			proximityList.length = 0;

			for (var i=0; i!=filtered.length; ++i)
				proximityList.push(filtered[i]);
		}

		return {object: bestObject, index:bestIndex, point: bestPoint, local: localSpace };
	}

	this.saveAsJavascript = function()
	{
		str = "";

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].saveAsJavascript === undefined)
				continue;

			str += this.objects[i].saveAsJavascript();

			str += "\n";
		}

		return str;
	}
}
