/**
 * 游戏核心代码
 * 贪吃蛇
 * 方块围成一个方形，作为墙
 * 蛇身体又球体组成
 * 上下左右键移动蛇方向
 * ↑↓←→,space(钻地),enter（开始暂停）
 * 蛇头head与物体判断碰撞，自身身体ball，墙wall
 * 关键词head，ball，wall，food
 * 场景构建、蛇移动、碰撞检测、随机食物、蛇身体增长
 */

 var Game=function(){
     //分数
     this.score=0;
    /**
     * 玩家控制的方向
     * @type {boolean}
     */
     this.on=false;
     this.under=false;
     this.left=true;
     this.right=false;
     //是否在地下
     this.underground=false;
    /**
     * 各个方向的速度
     * @type {number}
     */
    //蛇鳞片间距，为一个基本移动单位
    this.speed=2;
    //倍数
    this.times=2;
    //游戏是否开始
    this.isStart=false;
    //动画Id
    this.animateId=null;
    //改变颜色
    this.updateColor=false;
    //颜色下标
    this.colorIndex=0;
    //rgb进位值
    this.rgb1=Math.pow(256,2);
    this.rgb2=256;
    this.rgb3=1;
    //调整方向,0=（w=-z）,1=(w=x),2=(w=z),3=(w=-x)
    this.wdirection=0;


    this.balls=[]//蛇身体个数
    this.foods=[];//食物
    this.colors=[{color:0xfeb74c},{color:0xffffff},{color:0x353aff}];
    this.geometry=new THREE.SphereGeometry(25,40,40);
    this.snakeMaterial=new THREE.MeshBasicMaterial(this.colors[this.colorIndex]);
    this.foodGeo=new THREE.SphereGeometry(25,40,40);
    this.yellowfoodmaterial=new THREE.PointsMaterial(this.colors[0]);
    this.whitefoodmaterial=new THREE.PointsMaterial(this.colors[1]);
    this.bluefoodmaterial=new THREE.PointsMaterial(this.colors[2]);

     this.scene=new THREE.Scene()
    this.scene.background=new THREE.Color(0x282828);

    this.camera=new THREE.PerspectiveCamera(45,window.innerWidth/window.innerHeight,1,10000);
    this.camera.position.set(500,800,1300);
    this.camera.lookAt(new THREE.Vector3());
    this.camera.add(new THREE.PointLight(0xffffff,0.8));
    //相机坐标
    this.camerapostion={x:500,y:800,z:1300}

    this.renderer=new THREE.WebGLRenderer({antialias:true})
    this.raycaster=new THREE.Raycaster();

    //grid
    var gridHelper=new THREE.GridHelper(1000,20);
    this.scene.add(gridHelper);

    //plane
    var geometry=new THREE.PlaneBufferGeometry(1000,1000);
    geometry.rotateX(-Math.PI/2);
    this.plane=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({visible:false}));
    this.scene.add(this.plane);

    //lights
    var ambientLight=new THREE.AmbientLight(0x606060);
    this.scene.add(ambientLight);

    var directionalLight=new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 0.75, 0.5).normalize();
    this.scene.add(directionalLight);

    //renderer
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth,window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

 }
 Game.prototype={
     /**
      * 游戏初始化
      */
     init:function(){
         var self=this;
         self.createSnake();
         self.createFoods();
         var controls=new THREE.OrbitControls(self.camera,self.renderer.domElement);
         controls.addEventListener('change',self.my_render());
         controls.target.set(0,1.2,2);
         controls.update();
         document.addEventListener('keyup',function (event) {
             self.handleKeyUp(event);
         });
         self.updateOnStop();
     },

     /**
      * 创建鳞片（球），设置其x，z坐标
      * @param x
      * @param z
      * @returns {Mesh|qa} 返回鳞片对象
      */
     createBall:function(x,z,y){
         var self=this;
         var sphere=new THREE.Mesh(self.geometry,self.snakeMaterial);
         sphere.position.x=x;
         sphere.position.z=z;
         sphere.position.y=y;
         //sphere.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
         return sphere;
     },
     /**
      * 获取随机数，0到1000之间的尾数位25的数
      * 使得坐标在地面方块的中心
      * @returns {number}
      */
     getRandom:function(){
         var value=Math.random()*1000;
         value/=50;
         value=Math.floor(value);
         value=value*50-475;
         return value;
     },
     /**
      * 创建新的食物
      * 根据传入的颜色数字创建对应颜色的食物
      * 设置食物的动画上下浮动
      * @param color
      * @returns {Points|Mb} 返回食物
      */
     createFood:function(color){
       var self=this;
       switch (color) {
           case 0:
               var box=new THREE.Points(self.foodGeo,self.yellowfoodmaterial);
               break
           case 1:
               var box=new THREE.Points(self.foodGeo,self.whitefoodmaterial);
               break
           case 2:
               var box=new THREE.Points(self.foodGeo,self.bluefoodmaterial);
       }

       if (self.getRandom() < 0) {
           box.position.y=-25;
           createjs.Tween.get(box.position,{loop:true})
               .to({y:-50},1000,createjs.Ease.cubicIn)
               .to({y:-25},1000,createjs.Ease.cubicIn);
       }else {
           box.position.y=25;
           createjs.Tween.get(box.position,{loop:true})
               .to({y:50},1000,createjs.Ease.cubicIn)
               .to({y:25},1000,createjs.Ease.cubicIn);
       }
       box.position.z=self.getRandom();
       box.position.x=self.getRandom();
       return box;
     },
     /**
      * 创建所有食物
      * 食物之间不能重叠
      */
     createFoods:function(){
         var self=this;
         for (var i = 0; i < 3; i++) {
             var box=self.createFood(i);
             var same=true;
             while (same) {
                 same=false;
                 for (var j = 0; j < self.foods.length; j++) {
                     var food=self.foods[j];
                     if (box.position.x === food.position.x&&
                         box.position.y === food.position.y&&
                         box.position.z === food.position.z) {
                         same=true;
                         box=self.createFood(i);
                         break;
                     }
                 }
             }
             self.foods.push(box);
             self.scene.add(box);
         }
     },
     /**
      * 食物被吃掉后，更新补充食物
      * 更新到对应的颜色且不能和其他食物重叠
      * @param box
      */
     updateFoods:function(box){
         var self=this;
         //更新食物
         self.foods.splice(self.foods.indexOf(box),1);
         self.foodAteAnimation(box);
         var index=0;
         if (box.material.color.getHex()===self.bluefoodmaterial.color.getHex()){
             index=2;
         }else if (box.material.color.getHex() === self.whitefoodmaterial.color.getHex()) {
             index=1;
         }else {
             index=0;
         }
         var food=self.createFood(index);
         var same=true;
         while (same) {
             same=false;
             for (var j = 0; j < self.foods.length; j++) {
                 var f=self.foods[j];
                 if (food.position.x === f.position.x&&
                     food.position.y === f.position.y&&
                     food.position.z === f.position.z) {
                     same=true;
                     food=self.createFood(index);
                     break;
                 }
             }
         }
         self.scene.add(food);
         self.foods.push(food);
     },
     /**
      * 蛇吃掉食物后，身体增长5个鳞片
      * 按照将要走的方向增加到头部，每隔一个self.speed就添加一个鳞片
      * self.speed为每帧蛇位移的最小速度，也是蛇鳞片中心的间距
      */
     snakeEatFood:function(){
         var self=this;
         if (self.on === true) {
             for (let i = 1; i <= 5; i++) {
                 var sphere=self.createBall(self.balls[0].position.x,
                     self.balls[0].position.z-self.speed*i,
                     self.balls[0].position.y);
                 self.balls.unshift(sphere);
                 self.scene.add(sphere);
             }
         }
         if (self.under === true) {
             for (let i = 1; i <= 5; i++) {
                 var sphere=self.createBall(self.balls[0].position.x,
                     self.balls[0].position.z+self.speed*i,
                     self.balls[0].position.y);
                 self.balls.unshift(sphere);
                 self.scene.add(sphere);
             }
         }
         if (self.left === true) {
             for (let i = 1; i <= 5; i++) {
                 var sphere=self.createBall(self.balls[0].position.x-self.speed*i,
                     self.balls[0].position.z,
                     self.balls[0].position.y);
                 self.balls.unshift(sphere);
                 self.scene.add(sphere);
             }
         }
         if (self.right === true) {
             for (let i = 1; i <= 5; i++) {
                 var sphere=self.createBall(self.balls[0].position.x+self.speed*i,
                     self.balls[0].position.z,
                     self.balls[0].position.y);
                 self.balls.unshift(sphere);
                 self.scene.add(sphere);
             }
         }
     },
     /**
      * 当食物被吃掉后，判断是否结束游戏
      * 吃掉不同颜色的食物后死掉
      * 当颜色正确时，将蛇设置为颜色可变，让其变为下一个颜色
      * 更新食物和蛇
      * 启动蛇吃食物的动画
      * 分数上升
      */
     updateFoodsAndSnake:function(){
       var self=this;
       var box=self.getCrashObject();
       if (box == null)
           return;
       if (self.balls[0].material.color.getHex() !== box.material.color.getHex()) {
           self.failed();
           return;
       }
       self.updateColor=true;
       self.colorIndex=(self.colorIndex+1)%3;
       self.updateFoods(box);
       self.snakeEatFood();
       self.eatFoodAnimation();
       self.score+=10;
       self.updateScore(self.score);
     },
     changeDirection:function(code){
         var self=this;
         if (self.wdirection === 0) {
             switch (code) {
                 //上
                 case 87:
                     if (self.under !== true) {
                         self.on=true;
                         self.under=false;
                         self.left=false;
                         self.right=false;
                     }
                     break
                 //下
                 case 83:
                     if (self.on !== true) {
                         self.on=false;
                         self.under=true;
                         self.left=false;
                         self.right=false;
                     }
                     break
                 //左
                 case 65:
                     if (self.right !== true) {
                         self.on=false;
                         self.under=false;
                         self.left=true;
                         self.right=false;
                     }
                     break
                 //右
                 case 68:
                     if (self.left !== true) {
                         self.on=false;
                         self.under=false;
                         self.left=false;
                         self.right=true;
                     }
                     break
             }
         }else if (self.wdirection === 1) {
             switch (code) {
                 //上
                 case 87:
                     if (self.left !== true) {
                         self.on=false;
                         self.under=false;
                         self.left=false;
                         self.right=true;
                     }
                     break
                 //下
                 case 83:
                     if (self.right !== true) {
                         self.on=false;
                         self.under=false;
                         self.left=true;
                         self.right=false;
                     }
                     break
                 //左
                 case 65:
                     if (self.under !== true) {
                         self.on=true;
                         self.under=false;
                         self.left=false;
                         self.right=false;
                     }
                     break
                 //右
                 case 68:
                     if (self.on !== true) {
                         self.on=false;
                         self.under=true;
                         self.left=false;
                         self.right=false;
                     }
                     break
             }
         }else if (self.wdirection === 2) {
             switch (code) {
                 //上
                 case 87:
                     if (self.on !== true) {
                         self.on=false;
                         self.under=true;
                         self.left=false;
                         self.right=false;
                     }
                     break
                 //下
                 case 83:
                     if (self.under !== true) {
                         self.on=true;
                         self.under=false;
                         self.left=false;
                         self.right=false;
                     }
                     break
                 //左
                 case 65:
                     if (self.left !== true) {
                         self.on=false;
                         self.under=false;
                         self.left=false;
                         self.right=true;
                     }
                     break
                 //右
                 case 68:
                     if (self.right !== true) {
                         self.on=false;
                         self.under=false;
                         self.left=true;
                         self.right=false;
                     }
                     break
             }
         }else if (self.wdirection === 3) {
             switch (code) {
                 //上
                 case 87:
                     if (self.right !== true) {
                         self.on=false;
                         self.under=false;
                         self.left=true;
                         self.right=false;
                     }
                     break
                 //下
                 case 83:
                     if (self.left !== true) {
                         self.on=false;
                         self.under=false;
                         self.left=false;
                         self.right=true;
                     }
                     break
                 //左
                 case 65:
                     if (self.on !== true) {
                         self.on=false;
                         self.under=true;
                         self.left=false;
                         self.right=false;
                     }
                     break
                 //右
                 case 68:
                     if (self.under !== true) {
                         self.on=true;
                         self.under=false;
                         self.left=false;
                         self.right=false;
                     }
                     break
             }
         }
     },
     onCameraChange:function(){
         var self=this;
         if (self.camerapostion.x === self.camera.position.x &&
             self.camerapostion.y === self.camera.position.y&&
             self.camerapostion.z === self.camera.position.z) {
             return;
         }
         self.camerapostion.x = self.camera.position.x;
         self.camerapostion.y = self.camera.position.y;
         self.camerapostion.z = self.camera.position.z;
         if (self.camerapostion.x > 0) {
             if (self.camerapostion.x >= Math.abs(self.camerapostion.z)) {
                 self.wdirection=3;
             }else if (self.camerapostion.z>0) {
                 self.wdirection=0;
             }else {
                 self.wdirection=2;
             }
         }else {
             if (Math.abs(self.camerapostion.x) >= Math.abs(self.camerapostion.z)) {
                 self.wdirection=1;
             }else if (self.camerapostion.z > 0) {
                 self.wdirection=0;
             }else {
                 self.wdirection=2
             }
         }
         console.log("direction="+self.direction);
     },
     updateSnakeColor:function(){
       var self=this;
       if (self.updateColor===true){
           self.changeColor(self.colorIndex);
       }
     },
     changeColor:function(index){
         var self=this;
         var color=self.balls[0].material.color.getHex();
         if (color === self.colors[index].color) {
             self.updateColor=false;
         }

         var r1=color>>>16,r2=self.colors[index].color>>>16;
         var g1=color&0x00ff00,g2=self.colors[index].color&0x00ff00;
         var b1=color&0x0000ff,b2=self.colors[index].color&0x0000ff;
         if (r1 < r2) {
             self.balls[0].material.color.set(self.balls[0].material.color.getHex()+self.rgb1);
         }else if (r1 > r2) {
             self.balls[0].material.color.set(self.balls[0].material.color.getHex()-self.rgb1);
         }
         if (g1 < g2) {
             self.balls[0].material.color.set(self.balls[0].material.color.getHex()+self.rgb2);
         }else if (g1 > g2) {
             self.balls[0].material.color.set(self.balls[0].material.color.getHex()-self.rgb2);
         }
         if (b1 < b2) {
             self.balls[0].material.color.set(self.balls[0].material.color.getHex()+self.rgb3);
         }else if (b1 > b2) {
             self.balls[0].material.color.set(self.balls[0].material.color.getHex()-self.rgb3);
         }
         console.log("color="+self.balls[0].material.color.getHexString())
         /*if (color < self.colors[index].color) {
             if (color+self.rgb1<=self.colors[index].color){
                 self.balls[0].material.color.set(color+self.rgb1);
             } else if (color + self.rgb2 <= self.colors[index].color) {
                 self.balls[0].material.color.set(color+self.rgb2);
             }else if (color + self.rgb3 <= self.colors[index].color) {
                 self.balls[0].material.color.set(color+self.rgb3);
             }
         }else if (color > self.colors[index].color) {
             if (color-self.rgb1>=self.colors[index].color){
                 self.balls[0].material.color.set(color-self.rgb1);
             } else if (color-self.rgb2 >= self.colors[index].color) {
                 self.balls[0].material.color.set(color-self.rgb2);
             }else if (color - self.rgb3 >= self.colors[index].color) {
                 self.balls[0].material.color.set(color-self.rgb3);
             }
         }*/
     },
     addSuccessFn:function(success){
         this.updateScore=success;
     },
     addFailedFn:function(failed){
         this.failed=failed;
     },
     /**
      * 创建蛇整体
      * 每个鳞片的初始位置都是（0，0，0）
      * 并将鳞片（球）添加都balls（鳞片集合，蛇整体）中和scene（场景）中
      */
     createSnake:function(){
         var self=this;
         for (var i = 0; i < 50; i++) {
             var sphere=self.createBall(25,25,25);
             this.balls.push(sphere);
             this.scene.add(sphere);
         }
     },
     updateOnStop:function(){
         var self=this;
         self.my_render();
         self.animateId=requestAnimationFrame(function(){
             self.updateOnStop();
         })
     },
     /**
      * 移动蛇的触发函数，使用方法后，根据将要移动的方向、最小移动距离speed、多少倍最小移动距离times，
      * 在将要移动的方向上添加鳞片（球，球心之间的距离为最小移动距离speed），没隔speed距离添加一个鳞片，添加times个，
      * 去除蛇尾部的鳞片times个
      * 达到移动的效果
      */
     moveSnake:function(){
         var self=this;
         self.onCameraChange();
         self.updateFoodsAndSnake();
         self.downSnake();
         self.updateSnakeColor();
         if (self.on === true) {
             for (let i = 1; i <= self.times; i++) {
                 self.scene.remove(self.balls[self.balls.length-1]);
                 self.balls.pop();
                 var sphere=self.createBall(self.balls[0].position.x,
                     self.balls[0].position.z-self.speed*i,
                     self.balls[0].position.y);
                 self.adjust(sphere.position);
                 self.balls.unshift(sphere);
                 self.scene.add(sphere);
             }
         }
         if (self.under === true) {
             for (let i = 1; i <= self.times; i++) {
                 self.scene.remove(self.balls[self.balls.length-1]);
                 self.balls.pop();
                 var sphere=self.createBall(self.balls[0].position.x,
                     self.balls[0].position.z+self.speed*i,
                     self.balls[0].position.y);
                 self.adjust(sphere.position);
                 self.balls.unshift(sphere);
                 self.scene.add(sphere);
             }
         }
         if (self.left === true) {
             for (let i = 1; i <= self.times; i++) {
                 self.scene.remove(self.balls[self.balls.length-1]);
                 self.balls.pop();
                 var sphere=self.createBall(self.balls[0].position.x-self.speed*i,
                     self.balls[0].position.z,
                     self.balls[0].position.y);
                 self.adjust(sphere.position);
                 self.balls.unshift(sphere);
                 self.scene.add(sphere);
             }
         }
         if (self.right === true) {
             for (let i = 1; i <= self.times; i++) {
                 self.scene.remove(self.balls[self.balls.length-1]);
                 self.balls.pop();
                 var sphere=self.createBall(self.balls[0].position.x+self.speed*i,
                     self.balls[0].position.z,
                     self.balls[0].position.y);
                 self.adjust(sphere.position);
                 self.balls.unshift(sphere);
                 self.scene.add(sphere);
             }
         }
         self.my_render();
         self.animateId=requestAnimationFrame(function () {
             self.moveSnake();
         })
     },
     downSnake:function(){
       var self=this;
         if (self.underground === false) {
           if (self.balls[0].position.y <25) {
               self.balls[0].position.y+=self.speed;
           }
       }else if (self.underground === true) {
           if (self.balls[0].position.y > -25) {
               self.balls[0].position.y-=self.speed;
           }
       }
     },
     getCrashObject:function(){
         var self=this;
         var originPoint=self.balls[0].position.clone();
         
         for (var vertexIndex = 0; vertexIndex < self.balls[0].geometry.vertices.length; vertexIndex++) {
             //定点原始坐标
             var localVertex=self.balls[0].geometry.vertices[vertexIndex];
             //顶点经过变换后的坐标:将物体的本地坐标乘以变换矩阵，得到了这个物体在世界坐标系中的值
             var globalVertex=localVertex.applyMatrix4(self.balls[0].matrix);
             //获的由中心指向顶点的向量
             var directionVector=globalVertex.sub(self.balls[0].position);

             //将方向向量初始化
             self.raycaster.set(originPoint,directionVector.clone().normalize());
             //检测射线与多个物体的相交情况
             var collisionResults=self.raycaster.intersectObjects(self.foods);
             //如果返回结果不为空，且交点与射线起点的距离小于物体中心至顶点的距离，则发生碰撞
             if (collisionResults.length>0&&collisionResults[0].distance<directionVector.length()) {
                 return collisionResults[0].object;
             }
         }
         return null;
     },
     /**
      * 判断坐标是否超出地图，超过则从另一边出来
      * @param position
      */
     adjust:function(position){
         if (position.x >= 500) {
             position.x=-500;
         }else if (position.x <= -500) {
             position.x=500;
         }
         if (position.z >= 500){
             position.z=-500;
         } else if (position.z <= -500) {
             position.z=500;
         }
     },

     /**
      * 渲染刷新
      */
     my_render:function () {
         var self=this;
         self.renderer.render(self.scene,self.camera);
     },
     stop:function(){
         var self=this;
         if (self.animateId !== null) {
             cancelAnimationFrame(self.animateId);
             self.animateId=null;
         }
     },
     eatFoodAnimation:function(){
         var self=this;
         createjs.Tween.get(self.balls[0].scale).to({x:2,y:2,z:2},500,createjs.Ease.cubicOut).to({x:1,y:1,z:1},500);
     },
     foodAteAnimation:function(food){
         var self=this;
         self.scene.remove(food);
     },

     /**
      * 当w,s,a,d键盘被按后起来时，改变方向
      * @param event
      */
     handleKeyUp:function (event) {
         var self=this;
         console.log(event.keyCode);
         self.changeDirection(event.keyCode);
         switch (event.keyCode) {
             case 32:
                 if (self.underground === true) {
                     self.underground=false;
                 }else {
                     self.underground=true;
                 }
                 console.log('underground='+self.underground);
                 break
             case 13:
                 if (this.isStart === false) {
                     self.stop();
                     self.moveSnake();
                     this.isStart=true;
                 }else {
                     self.stop();
                     self.updateOnStop();
                     this.isStart=false;
                 }
                 break
             case 73:
                 restart();
                 break
         }
     },
     restart:function () {
         var self=this;
         if (self.isStart === true) {
             self.stop();
             self.updateOnStop();
             this.isStart=false;
         }
         self.score=0;
         self.updateScore(0);
         while (self.balls.length!==0){
             self.scene.remove(self.balls.pop());
         }
         while (self.foods.length!==0) {
             self.scene.remove(self.foods.pop());
         }
         self.on=false;
         self.under=false;
         self.left=true;
         self.right=false;
         self.underground=false;
         self.isStart=false;
         self.animateId=null;
         self.updateColor=false;
         self.colorIndex=0;
         self.snakeMaterial.color.set(self.colors[self.colorIndex].color);

         self.createSnake();
         self.createFoods();
     }
 }
