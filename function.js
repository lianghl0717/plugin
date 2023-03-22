function shadowDraw() {
    clearCtx();
    //世界地址
    GWorld = readLong(baseAddr + 0xA6EF9D0);
    if (isNull(GWorld)) return;
    //获取自己
    const NetDriver = readLong(GWorld + 0x98); //NetDriver* NetDriver
    const ServerConnection = readLong(NetDriver + 0x78); //NetConnection* ServerConnection
    const localPlayerController = readLong(ServerConnection + 0x98); //STExtraPlayerController* PlayerController;
    //拿到自己的坐标
    const mySelf = readLong(localPlayerController + 0x520); //Pawn* Pawn;
    //if (isNull(mySelf)) return;//注释该行，观战透视
    //拿到我方队伍的坐标
    const teamCopy = readInt(mySelf + 0xA08); //int TeamID
    myTeam = teamCopy <= 100 ? teamCopy : myTeam;
    const playerCameraManager = readLong(localPlayerController + 0x5A8); //PlayerCameraManager* PlayerCameraManager
    if (isNull(playerCameraManager)) return;
    const povAddr = playerCameraManager + 0x1130 + 0x10; //TViewTarget ViewTarget
    const camViewInfo = {
        Location: {
            X: readFloat(povAddr),
            Y: readFloat(povAddr + 4),
            Z: readFloat(povAddr + 4 + 4)
        },
        Rotation: {
            Pitch: readFloat(povAddr + 0x18),
            Yaw: readFloat(povAddr + 0x18 + 4),
            Roll: readFloat(povAddr + 0x18 + 4 + 4)
        },
        FOV: readFloat(povAddr + 0x24)
    }
    //雷达，获取相机旋转视角
    let camAngle = camViewInfo.Rotation.Yaw;
    //一帧只计算一次，减少性能消耗
    const tempMatrix = RotatorToMatrix(camViewInfo.Rotation);

    let playerCout = 0;
    let ai = 0;
    let topEnemy = 0;
    const view_arr = [];
 //   let BView = 0; //视角算法

    /*追踪判断*************************/
    for (let i = 0; i < actorCache.length; i++) {
        //排除自己
        const actor = actorCache[i];
        if (mySelf == actor) continue;
        //死亡判断 bDead
        //const bDead = readInt(actor + 0xD58)
         //if(bDead !=2) continue;
        //排除队友 小黄鸡
        const team = readInt(actor + 0xA08); //int TeamID
        if (myTeam == team || team == -1) continue;
        //最大生命值
        const hpmax = readFloat(actor + 0xD08); //float HealthMax;	
        //获取生命值
        const hp = readFloat(actor + 0xD00); //float Health;
        const renhp = 100 * hp / hpmax;
        //获取人物状态
        const StatusOffset = readInt(actor + 0xF90); //PawnStateRepSyncData PawnStateRepSyncData
        const rootComponent = readLong(actor + 0x258); //SceneComponent* RootComponent
        if (isNull(rootComponent)) continue;

        const worldPos = {
            X: readFloat(rootComponent + 0x1C0),
            Y: readFloat(rootComponent + 0x1C0 + 4),
            Z: readFloat(rootComponent + 0x1C0 + 4 + 4)
        }

        //计算距离
        const distX = (worldPos.X - camViewInfo.Location.X) / 100;
        const distY = (worldPos.Y - camViewInfo.Location.Y) / 100;
        let distance = (distX * distX) + (distY * distY);
        const distZ = (worldPos.Z - camViewInfo.Location.Z) / 100;
        distance = Math.ceil(Math.sqrt((distZ * distZ) + distance));

        const zb1 = {
            X: worldPos.X,
            Y: worldPos.Y,
            Z: worldPos.Z + 80.0
        }

        const fkzb1 = world2Screen(zb1, camViewInfo, tempMatrix);
        const dx = Math.abs(sWidth / 2 - fkzb1.X);
        const dy = Math.abs(sHeight / 2 - fkzb1.Y);
        const d2ddis = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)); //敌人屏幕位置~准心 之间的 距离

        if (distance <= 50) {
        view_arr.push(d2ddis);
        }
    };
//	BView = xier(view_arr)[0]; //视角  从小到大排序，取最近
    /*追踪判断*************************/

    for (let i = 0; i < actorCache.length; i++) {
        //排除自己
        const actor = actorCache[i];
        if (mySelf == actor) continue;
        //死亡判断 bDead
        //const bDead = readInt(actor + 0xD58)
         //if(bDead !=2) continue;
        //排除队友 小黄鸡
        const team = readInt(actor + 0xA08); //int TeamID
        if (myTeam == team || team == -1) continue;
        //最大生命值
        const hpmax = readFloat(actor + 0xD08); //float HealthMax;	
        //获取生命值
        const hp = readFloat(actor + 0xD00); //float Health;
        const renhp = 100 * hp / hpmax;
        //获取人物状态
        const StatusOffset = readInt(actor + 0xF90); //PawnStateRepSyncData PawnStateRepSyncData
        const rootComponent = readLong(actor + 0x258); //SceneComponent* RootComponent
        if (isNull(rootComponent)) continue;

        const worldPos = {
            X: readFloat(rootComponent + 0x1C0),
            Y: readFloat(rootComponent + 0x1C0 + 4),
            Z: readFloat(rootComponent + 0x1C0 + 4 + 4)
        }

        //计算距离
        const distX = (worldPos.X - camViewInfo.Location.X) / 100;
        const distY = (worldPos.Y - camViewInfo.Location.Y) / 100;
        let distance = (distX * distX) + (distY * distY);
        const distZ = (worldPos.Z - camViewInfo.Location.Z) / 100;
        distance = Math.ceil(Math.sqrt((distZ * distZ) + distance));
        //敌人yaw  单位：角度
        const angleOffset = readFloat(actor + 0x198);
        //雷达获取敌人世界坐标
        const wradPos = { 
            X: distX,
            Y: distY,
            dist: distance
        };
        const wAngle = (180.0 / Math.PI) * Math.atan2(wradPos.Y, wradPos.X); //雷达，角度相关
        const Angle = camAngle - wAngle + 90; //雷达，角度相关
        const towards = angleOffset - camAngle - 90; //雷达敌人视角朝向

        //雷达获取敌人屏幕坐标
        const radPos = { 
            X: wradPos.dist * Math.cos(Angle / 180.0 * Math.PI),
            Y: wradPos.dist * Math.sin(Angle / 180.0 * Math.PI)
        };

        const zb1 = {
            X: worldPos.X,
            Y: worldPos.Y,
            Z: worldPos.Z + 80.0
        }

        const zb2 = {
            X: worldPos.X,
            Y: worldPos.Y,
            Z: worldPos.Z - 88.0
        }

        //顶部方框线
        const fkzb1 = world2Screen(zb1, camViewInfo, tempMatrix);
        //底部方框线
        const fkzb2 = world2Screen(zb2, camViewInfo, tempMatrix);
        const fkgao = fkzb2.Y - fkzb1.Y;
        const fkkuan = fkgao / 2;
        //偏移
    //	const isFire = readFloat(mySelf + 0x1738);
        const selflocalPlayerbase = readLong(localPlayerController + 0x520); //Pawn* Pawn
        const weaponManagerComponent = readLong(selflocalPlayerbase + 0x2750); //CharacterWeaponManagerComponent* WeaponManagerComponent;
        const cachedCurUseWeapon  = readLong(weaponManagerComponent + 0x2f0); //STExtraWeapon* CachedCurUseWeapon
        const shootWeaponComponent = readLong(cachedCurUseWeapon + 0xf00); //STExtraShootWeaponComponent* ShootWeaponComponent
        const ownerShootWeapon = readLong(shootWeaponComponent + 0x228); //STExtraShootWeapon* OwnerShootWeapon
        const shootWeaponEntityComp = readLong(ownerShootWeapon + 0x1130); //ShootWeaponEntity* ShootWeaponEntityComp
        const BulletTrack = readFloat(playerCameraManager + 0x5a8);
        if (app.wuhou) {
        h5gg.setValue(shootWeaponEntityComp + 0x1688, 0.01, "F32");
    }

    //聚点
    if (app.judian) {
        h5gg.setValue(shootWeaponEntityComp + 0x16f4, 0.01, 'F32');
    }

    if (app.fangdou){

        h5gg.setValue(shootWeaponEntityComp + 0x17b8, 0.001, "F32");//float RecoilKickADS

}
        //const mySelf = readLong(localPlayerController + 0x518);
        /*追踪*****/
        const dx = Math.abs(sWidth / 2 - fkzb1.X);
        const dy = Math.abs(sHeight / 2 - fkzb1.Y);
        const d2ddis = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2)); //敌人屏幕位置~准心 之间的 距离

        const bIsAI = Number(h5gg.getValue(actor + 0xA24, "U8")); //bool bIsAI
        //伞兵计数
        if (StatusOffset == 33554448 || StatusOffset == 33554449) topEnemy += 1;

        //记录要绘制的全部信息
        const actorInfo = {
            x: fkzb1.X, //x坐标
            y: fkzb1.Y, //y坐标
            w: fkkuan, //宽
            h: fkgao, //高
            //hp: hp, //生命值
            hp: renhp, //生命值
            isAI: bIsAI, //是否为机器人
            team: team, //队伍
            name: name, //名字
            dis: distance, //距离
            //weaponid: weaponid, //手持枪械
            radx: radPos.X, //雷达x坐标
            rady: radPos.Y, //雷达y坐标
            towards: towards, //人物朝向
            zt: StatusOffset, //人物状态
/*
            playerCameraManager: playerCameraManager,
            shootWeaponEntityComp: shootWeaponEntityComp,
            camViewInfo: camViewInfo,
            tempMatrix: tempMatrix,
            isFire: isFire,
            d2ddis: d2ddis,
            actorbone: actor,
            localPlayerController: localPlayerController,
            mySelf: mySelf,
            BView: BView
            */

        };
        if(distance < 500) { //可调绘制范围
    shadowInfo(actorInfo);
        }
    if (bIsAI) {
            ai++;  
        } else {
            playerCout++;
        }
    }
    
        //伞兵
    if (topEnemy > 0) {
        drawText(`⚠️空降: ${topEnemy}`, sWidth / 2, - 20, 20, "yellow", "center", true);
        }
        //人数统计
        //drawRoundRect(sWidth / 2 - 90, 0 + app.renshu, 180, 38, 20, 'rgba(255,255,255,0.5)', true); //利用圆角矩形填充

    if (playerCout + ai < 1) {
        drawText("ST", sWidth / 2, - 20, 20, "#fff", false);
        drawText("ST", sWidth / 2, - 20, 20, "#f00", true);
        }
        //人数
    if (app.checkboxList.isNumber) {
        //drawText(playerCout + ai, sWidth / 2 + 70, - 20, 20, playerCout > 0 ? "#f00" : "white", "center", true);
        drawText(playerCout + ai, sWidth / 2, - 20, 20, "#fff", false);
        drawText(playerCout + ai, sWidth / 2, - 20, 20, "#f00", true);
    }
    
    //雷达
    if (app.checkboxList.isRadar) {	
        //起点xy，矩形宽高，颜色，是否填充矩形
        drawCircular(sWidth / 2, sHeight / 2, 100, 80, "red", 2, false); //大圈圈
        drawCircular(sWidth / 2, sHeight / 2, 100, 48, "aqua", 2, false); //小圈圈
        //线条 起始点xy，终点xy，颜色
        drawLine(sWidth / 2 - 80, sHeight / 2, sWidth / 2 + 80, 80, "#13ce66", 2); //横线 
        drawLine(sWidth / 2, sHeight / 2, sWidth / 2, sHeight / 2 + 80, "#13ce66", 2); //竖线
        drawLine(sWidth / 2 - 56, sHeight / 2 - 56, sWidth / 2, sHeight / 2, "red", 2); //左竖斜线
        drawLine(sWidth / 2 + 56, sHeight / 2 - 56, sWidth / 2, sHeight / 2, "red", 2); //右竖斜线
    }
};



function shadowInfo(objectInfo) {
    //人机判断 是的话对标变为AI
    //if (objectInfo.isAI) objectInfo.team = "AI";
    //雷达
    if (app.checkboxList.isRadar) {
        if (objectInfo.dis < 340 ) {
            //drawCMark((objectInfo.radx / 4.4 + 80) + app.leidaX, (-objectInfo.rady / 4.4 + 80) + app.leidaY, 3.2, objectInfo.towards, objectInfo.hp <= 0 ? "white" : objectInfo.isAI ? "lime" : "red", "white");
            drawCMark(objectInfo.radx / 4.4 + sWidth / 2, -objectInfo.rady / 4.4 + sHeight / 2, 3.2, objectInfo.towards, objectInfo.hp <= 0 ? "white" : objectInfo.isAI ? "lime" : "red", "white");
        }
    }

    //射线
        //if (objectInfo.hp > 0) {
        //drawLine(sWidth / 2, 34 + app.renshu, objectInfo.x, objectInfo.y - 25, "white", 2);
        //}
    
    //超出屏幕只绘制射线 背敌
    if (objectInfo.x < 0 || objectInfo.y < 0 || objectInfo.x > sWidth || objectInfo.y > sHeight) {
    // 背敌
        if (objectInfo.x < 0) objectInfo.x = 15;
        if (objectInfo.y < 0) objectInfo.y = 15;
        if (objectInfo.x > sWidth) objectInfo.x = sWidth - 15;
        if (objectInfo.y > sHeight) objectInfo.y = sHeight - 15;
        drawCircular(objectInfo.x, objectInfo.y, 100, 12, objectInfo.isAI ? "rgba(0,255,0,1)" : "rgba(255,0,0,1)", true); 
        drawText(`${objectInfo.dis}m`, objectInfo.x, objectInfo.y - 13, 8, "white", "center", true);
    return
    }
    if (app.checkboxList.isNumber){
    //方框
    drawRect(objectInfo.x - objectInfo.w / 2, objectInfo.y, objectInfo.w, objectInfo.h, objectInfo.hp <= 0 ? "yellow" : objectInfo.isAI ? "lime" : "white", false, app.xian);

    //距离
    //drawText(objectInfo.dis + "m", objectInfo.x, objectInfo.y - 26, 10, "yellow", "center", true);
    drawText1(objectInfo.team + " " + " " + " " + " " + objectInfo.name, objectInfo.x, objectInfo.y - 18, 8, color = "#333", false);
    drawText1(objectInfo.team + " " + " " + " " + " " + objectInfo.name, objectInfo.x, objectInfo.y - 20, 8, color = "#FFF", true);
    //血量
    var colorGamer = "#02F702";
    if (objectInfo.hp == 120) {
//利用 drawCircle2 函数 绘制 (x轴 ， y轴 ，半径 ，初始点 ， 结束点，线宽)
drawCircle2(objectInfo.x, objectInfo.y - 20, 10, 0, objectInfo.hp / 19.1, 2)
} else {
drawCircle2(objectInfo.x, objectInfo.y - 20, 10, 0, objectInfo.hp / 15.9, 2)
}
drawText1(objectInfo.dis, objectInfo.x, objectInfo.y - 35, 10, color = "#FFFF00", true);
//	drawRoundRect(objectInfo.x - 12.5, objectInfo.y - 5, Math.ceil(objectInfo.hp / 4), 2, 2, objectInfo.hp <= 30 ? "rgba(255,0,0,0.8)" : "rgba(255,255,255,0.8)", true);
}
    //无后
    

    //追踪
    
};
