// src/three/Engine.js

import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { Octree } from '../libs/Octree.js';
import { Capsule } from '../libs/Capsule.js';
// ✨ 新增：导入后期处理相关的模块
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

export default class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.clock = new THREE.Clock();
        // 移动状态和速度
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        // ✨ 2. 添加新的属性
        this.worldOctree = new Octree(); // 用于存储世界碰撞几何体
        this.playerCollider = new Capsule( // 玩家的碰撞胶囊体
            new THREE.Vector3(0, 0.35, 0), // 胶囊体起始点 (相对玩家位置)
            new THREE.Vector3(0, 1.35, 0), // 胶囊体结束点 (决定了身高)
            0.35 // 胶囊体半径
        );
        this.playerOnFloor = false; // 玩家是否在地面上
        this.fpsLimit = 60; // 目标帧率上限
        this.fpsInterval = 1 / this.fpsLimit; // 每帧的最小间隔时间
        this.then = Date.now(); // 上一帧的时间戳
        this.spawnPoint = new THREE.Vector3();
    }

    /**
     * 初始化所有Three.js的核心组件
     */
    async init() {
        // --- 渲染器设置 ---
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.canvas.appendChild(this.renderer.domElement);

        // --- 交互相关 ---
        this.raycaster = new THREE.Raycaster();

        // --- 步骤1: 加载所有静态场景元素 ---
        await this.loadScene('/scene.json');

        this.setupAdvancedRendering();

        // --- 步骤2: 基于纯粹的静态场景，构建碰撞世界 ---
        console.log("正在构建世界碰撞八叉树...");
        this.worldOctree.fromGraphNode(this.scene);
        console.log("八叉树构建完成！");

        // --- 步骤3: 在世界构建完毕后，才创建并放入玩家 ---
        this.controls = new PointerLockControls(this.camera, document.body);
        this.scene.add(this.controls.object); // 将玩家添加到场景中

        // --- 步骤4: 设置玩家的初始位置并记录出生点 ---
        this.controls.object.position.copy(this.camera.position);
        this.spawnPoint.copy(this.camera.position);

        // --- 步骤5: 事件绑定和启动循环 ---
        this.bindEvents();
        this.animate();

        console.log("引擎已完全准备就绪！");
    }

    loadScene(path) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.ObjectLoader();
            loader.load(
                path,
                (loadedScene) => {
                    this.scene = loadedScene;

                    // 寻找真实相机
                    const newCamera = this.scene.getObjectByName('PlayerStartCamera');
                    if (newCamera && newCamera.isCamera) {
                        this.camera = newCamera;
                        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
                        this.camera.updateProjectionMatrix();
                    } else {
                        console.warn("场景中未找到 'PlayerStartCamera'，将使用默认相机。");
                        // 如果找不到，创建一个默认的
                        this.camera = new THREE.PerspectiveCamera(75, this.canvas.clientWidth / this.canvas.clientHeight, 0.1, 1000);
                    }

                    // 寻找可点击对象
                    this.clickableObjects = [];
                    this.scene.traverse((object) => {
                        if (object.userData && object.userData.id !== undefined) {
                            this.clickableObjects.push(object);
                        }
                    });
                    console.log("找到了可点击对象:", this.clickableObjects);
                    console.log("场景加载成功!");
                    
                    resolve(); //承诺完成！
                },
                undefined,
                (error) => {
                    console.error(`场景加载失败: ${path}`, error);
                    reject(error); //承诺失败！
                }
            );
        });
    }

    // ✨ 新增：配置高级渲染的专属方法
    setupAdvancedRendering() {
        // --- 1. 手动配置平行光的阴影相机 ---
        // 首先，通过名字找到场景中的平行光
        const directionalLight = this.scene.getObjectByName('DirectionalLight'); // 确保你的灯光在Editor里叫这个名字

        if (directionalLight && directionalLight.isDirectionalLight) {
            console.log("找到了平行光，正在手动配置其阴影...");
            const d = 80; // d 代表阴影相机的范围大小，可以根据你的场景尺寸调整
            directionalLight.shadow.camera.left = -d;
            directionalLight.shadow.camera.right = d;
            directionalLight.shadow.camera.top = d;
            directionalLight.shadow.camera.bottom = -d;


            // 调整阴影贴图的分辨率
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;

            // 微调阴影偏移，防止瑕疵
            directionalLight.shadow.bias = -0.0001;

            // 更新阴影相机的投影矩阵
            directionalLight.shadow.camera.updateProjectionMatrix();
            console.log("平行光阴影配置完成！");
        }

        // --- 2. 创建并配置后期处理效果 ---
        // 创建一个效果合成器，它将接管渲染流程
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // b. 添加辉光效果通道 (UnrealBloomPass)

        // ✨ 关键修复：使用渲染器画布的尺寸，而不是窗口尺寸
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width,height),
            0.1, // strength: 辉光强度
            0.1, // radius: 辉光半径
            0.9 // threshold: 阈值，多亮的东西才会发光
        );
        this.composer.addPass(bloomPass);

        // c. 添加抗锯齿通道 (SMAAPass)，作为最后一步，让画面更平滑
        const smaaPass = new SMAAPass(width * this.renderer.getPixelRatio(), height * this.renderer.getPixelRatio());
        this.composer.addPass(smaaPass);

        console.log("后期处理效果已配置！");
    }

    

    //绑定所有事件监听//
    bindEvents() {
        // 监听键盘事件
        document.body.addEventListener('keydown', this.onKeyDown.bind(this));
        document.body.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // 监听窗口大小调整
        window.addEventListener('resize', this.onResize.bind(this));
    }

    // 键盘按下事件处理
    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'KeyE':
                if (this.controls.isLocked) {
                    this.handleInteraction();
                }
                break;
        }
    }

    //键盘抬起事件处理
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyD': this.moveRight = false; break;
        }
    }

    //处理交互的方法//
    handleInteraction() {
        // 从屏幕中心 (0, 0) 发出射线
        this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.clickableObjects, true);

        if (intersects.length > 0 && intersects[0].distance < 5) {
            // 检查交点距离，避免与太远的物体交互
            // 假设交互距离为15个单位
            let intersectedObject = intersects[0].object;
            while (intersectedObject.parent && intersectedObject.userData.id === undefined) {
                intersectedObject = intersectedObject.parent;
            }
            const id = intersectedObject.userData.id;
            if (id !== undefined && this.clickCallback) {
                this.controls.unlock(); // 触发交互前先解锁
                this.clickCallback(id);
            }
        }
    }

    onClick(callback) {
        this.clickCallback = callback;
    }

    //处理窗口大小调整//
    onResize() {
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        // ✨ 新增：更新 composer 的尺寸
        if (this.composer) {
            this.composer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        }
    }

    //渲染循环
    animate() {
        requestAnimationFrame(() => this.animate());

        // ✨ 使用更平滑的方式来处理掉帧
        const delta = Math.min(this.clock.getDelta(), 0.1);

        if (this.controls.isLocked === true) {
            this.updatePlayer(delta);
            // 掉落检测
            // 检查玩家（相机）的Y坐标是否过低
            if (this.camera.position.y < -20) { // -20 是一个可以调整的阈值
                this.teleportPlayerToSpawn();
            }
        }

        //this.renderer.render(this.scene, this.camera);
        if (this.composer) {
            this.composer.render(); // ✨ 使用效果合成器进行渲染
        }
    }


    // ✨ 7. 新增：完整的、带碰撞检测的玩家更新函数
    updatePlayer(delta) {
        const speed = 3.0; // "米/秒"的行走速度
        const gravity = 30.0;

        // --- 步骤 1: 计算水平移动速度 (实现即走即停) ---
        const forwardInput = (this.moveForward ? 1 : 0) - (this.moveBackward ? 1 : 0);
        const sideInput = (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0);

        const forwardDir = new THREE.Vector3();
        this.camera.getWorldDirection(forwardDir);
        forwardDir.y = 0;
        forwardDir.normalize();

        const sideDir = new THREE.Vector3();
        sideDir.copy(forwardDir).cross(this.camera.up);

        const moveVector = new THREE.Vector3();
        moveVector.add(forwardDir.multiplyScalar(forwardInput));
        moveVector.add(sideDir.multiplyScalar(sideInput));
        if (moveVector.lengthSq() > 0) {
            moveVector.normalize();
        }
        // 直接设置水平速度，松开按键时，速度立刻归零
        this.velocity.x = moveVector.x * speed;
        this.velocity.z = moveVector.z * speed;


        // --- 步骤 2: 处理垂直移动 (重力) ---
        // 检查玩家当前是否在地面上
        const groundResult = this.worldOctree.capsuleIntersect(this.playerCollider);
        this.playerOnFloor = false;
        if (groundResult) {
            this.playerOnFloor = groundResult.normal.y > 0;
            // 如果在地面上，并且正在下落，则重置垂直速度
            if (this.playerOnFloor && this.velocity.y < 0) {
                this.velocity.y = 0;
            }
        }

        // 只有当玩家不在地面上时，才施加重力
        if (!this.playerOnFloor) {
            this.velocity.y -= gravity * delta;
        }

        // --- 步骤 3: 计算最终位移并应用碰撞 ---
        // 根据总速度计算本帧的期望位移
        const deltaPosition = this.velocity.clone().multiplyScalar(delta);
        this.playerCollider.translate(deltaPosition);

        // 进行最终的碰撞检测并修正位置
        const finalResult = this.worldOctree.capsuleIntersect(this.playerCollider);
        if (finalResult) {
            this.playerCollider.translate(finalResult.normal.multiplyScalar(finalResult.depth));
            // 如果修正后在地面上，再次确认垂直速度为0
            if (finalResult.normal.y > 0) {
                this.velocity.y = 0;
            }
        }

        // --- 步骤 4: 更新控制器（相机）的位置 ---
        // 最终位置由碰撞后的胶囊体决定
        this.controls.object.position.copy(this.playerCollider.end);
    }

    resetPlayerState() {
        // 重置速度向量
        this.velocity.set(0, 0, 0);
        // 强制将玩家碰撞体的位置与相机控制器同步
        // 这可以防止因任何异步原因导致的位置不同步
        if(this.controls && this.playerCollider){
            this.playerCollider.start.copy(this.controls.object.position);
            this.playerCollider.end.copy(this.controls.object.position);
            // 根据胶囊体定义调整高度
            this.playerCollider.end.y += 1.0; // 假设身高为1.0
            this.playerCollider.radius = 0.35;
        }
    }
    // 重生方法
    teleportPlayerToSpawn() {
        console.warn("玩家掉落虚空，正在重生...");
        // 停止所有移动
        this.velocity.set(0, 0, 0);

        // 将控制器（相机）直接传送回出生点
        this.controls.object.position.copy(this.spawnPoint);

        // ✨ 根据传送后的控制器位置，重置胶囊体的位置
        this.playerCollider.start.copy(this.controls.object.position).add(new THREE.Vector3(0, -1.0, 0));
        this.playerCollider.end.copy(this.controls.object.position);
    }
}