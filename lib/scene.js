function Scene()
{
	this.objects			= [];
	this.onChangeListeners	= [];
	this.boundsMin			= new Vector(100000,100000);
	this.boundsMax			= new Vector(-100000,-100000);

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

	this.onChange = function()
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
			this.onChangeListeners[i](this);
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

		this.onChange();
	}

	this.deleteAllObjects = function()
	{
		this.objects = [];
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

	this.draw = function (camera)
	{
		for (var i=0; i<this.objects.length; ++i)
		{
			this.objects[i].draw(camera);
		}
	}
	
	this.hitTest = function(a, b)
	{
		var results = [];
		
		for (var i=0; i<this.objects.length; ++i)
		{
			var temp = this.objects[i].hitTest;
			
			if (this.objects[i].hitTest !== undefined && this.objects[i].hitTest(a,b) == true && !this.objects[i].isFrozen())
			{
				results.push(this.objects[i]);
			}
		}
		
		return results;
	}

	this.rayHitTest = function(rayPos, rayDir)
	{
		var bestHit = {tRay:1000};
			
		for (var o=0; o<this.objects.length; ++o)
		{
			if (this.objects[o].rayHitTest === undefined)
				continue;

			var hits = this.objects[o].rayHitTest(rayPos, rayDir);
				
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
					bestPoint = {type: points[p].type, p:points[p].p, N:points[p].N};
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

			var d = length(sub(extraSnapPoints[p].p, mousePos));

			if (d<threshold && d<bestDistance)
			{
				bestDistance = d;
				bestPoint = {type: extraSnapPoints[p].type, p:extraSnapPoints[p].p, N:extraSnapPoints[p].N};
			}
		}

		return bestPoint;
	}

	this.getDragPoint = function(mousePos, threshold, localSpace, ignoreObjectList)
	{
		var bestPoint = null;
		var bestObject = null;
		var bestIndex = null;
		var bestDistance = 1000;

		if (ignoreObjectList == undefined)
			ignoreObjectList = [];

		for (var i=0; i<this.objects.length; ++i)
		{
			if (this.objects[i].getDragPoints === undefined)
				continue;

			if (ignoreObjectList.indexOf(this.objects[i]) >= 0)
				continue;

			var points = this.objects[i].getDragPoints(localSpace);

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
			}
		}

		return {object: bestObject, index:bestIndex, point: bestPoint };
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
