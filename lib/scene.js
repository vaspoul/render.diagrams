function Scene()
{
	var objects = [];
	
	this.addObject = function (object)
	{
		objects.push(object);
	}
	
	this.draw = function(camera)
	{
		camera.clear();
		
		for (var i=0; i<objects.length; ++i)
		{
			objects[i].draw(camera);
		}
	}
	
	this.hitTest = function(a, b)
	{
		var results = [];
		
		for (var i=0; i<objects.length; ++i)
		{
			var temp = objects[i].hitTest;
			
			if (objects[i].hitTest !== undefined && objects[i].hitTest(a,b) == true)
			{
				results.push(objects[i]);
			}
		}
		
		return results;
	}
}
