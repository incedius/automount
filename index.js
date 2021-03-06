const path = require('path'),
	  fs = require('fs')

module.exports = function AutoMount(mod) {
  let enabled=false,
    _inCombat=false,
    config,
    fileopen=true,
    stopwrite,
    mounted=false,
    delay=0,
    setMount=false,
    currentMount=0,
    bigzero = BigInt(0),
    w,
    loc,
	  flying=false

  try{
    config = JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'), 'utf8'))
    enabled = config.enabled
    msg("Config loaded")
  }
  catch(e){
    config = JSON.parse(fs.readFileSync(path.join(__dirname,'config-default.json'), 'utf8'))
    save(config,"config.json")
    msg("New Config loaded")
  }

  if(mod.majorPatchVersion >= 85){
    mod.game.initialize
    currentMount = config.currentMount[mod.game.me.name]
    delay = config.delay
    enabled = config.enabled
    if(enabled) msg('Automount ON. Delay set to ' + delay)
    else msg('Automount OFF')
  }
  
  mod.command.add(['automount','am'], {
    $none() {
      enabled=!enabled
      config.enabled = enabled
      save(config,"config.json")
      msg(enabled?'enabled':'disabled')
    },
    set(){
      setMount = ! setMount
      msg(setMount?'Setting Mount ON':'Setting Mount OFF')
    },
    delay(arg){
      delay = Number(arg)
      config.delay = delay
      save(config,"config.json")
      msg('delay set to ' + delay)
    }
  })
  
  

  mod.hook('S_USER_STATUS', 3, event => {
    _inCombat = (event.status == 1)
    
    if(_inCombat && enabled) delay = config.delay
  })
  
  mod.hook('C_PLAYER_LOCATION', 5, event => {
	flying=false
    if(enabled && !mounted && !_inCombat){
      switch (event.type){
        case 0:
        case 1:
          delay--
          w = event.w
          loc = event.loc
          mount()
          break
        default:
          delay = config.delay
      }
    }
  })
  
  mod.hook('C_START_SKILL', 7, {"order": -999}, event => {
	  return unmount()
  })
  
  mod.hook('C_PRESS_SKILL', 4, {"order": -999}, event => {
    return unmount()
  })
  
  mod.hook('C_PLAYER_FLYING_LOCATION', 4, event => {
	  flying = true
  })
  
  mod.hook('S_MOUNT_VEHICLE', 2, event => {
    if (!mod.game.me.is(event.gameId)) return
    
    mounted = true
	  flying = false
    
    if(setMount){
      currentMount = event.skill
      setMount = false
      config.currentMount[mod.game.me.name] = currentMount
      msg('Mount set to: ' + currentMount)
      save(config,"config.json")
    }
  })
  
  mod.hook('S_UNMOUNT_VEHICLE', 2, event => {
    if (!mod.game.me.is(event.gameId)) return
    
    mounted = false
    flying = false
    delay = config.delay
  })
  
  mod.hook('S_SHORTCUT_CHANGE', 2, event=>{
	  if(enabled && mounted) return false
  })
  
  function unmount(){
    if(enabled && mounted && !flying){
      mod.toServer('C_UNMOUNT_VEHICLE', 1, {})
      mod.toClient('S_UNMOUNT_VEHICLE', 2, {
        "gameId":  mod.game.me.gameId,
        "skill": currentMount
      })
      return false
	  }
    
    return true
  }
  
  function mount(){
    currentMount = config.currentMount[mod.game.me.name]

    if(enabled && delay<=0 && !_inCombat){
      if(currentMount==0 || currentMount==null){
        msg('mount not set. Use command: am set')
        enabled=false
        return
      }
      delay = config.delay
	  
      mod.toServer('C_START_SKILL', 7, {
        "skill": {
            "reserved": 0,
            "npc": false,
            "type": 1,
            "huntingZoneId": 0,
            "id": currentMount
        },
        "w": w,
        "loc": loc,
        "dest": {
            "x": 0,
            "y": 0,
            "z": 0
        },
        "unk": true,
        "moving": false,
        "continue": false,
        "target": bigzero,
        "unk2": false
      })
    }
  }

  function save(data, filename){
    if(fileopen) {
			fileopen=false
			fs.writeFile(path.join(__dirname, filename), JSON.stringify(data,null,"\t"), err => {
				if(err){
          mod.command.message('Error Writing File, attempting to rewrite')
          console.log(err)
        }
				fileopen = true
			})
		}
		else {
			clearTimeout(stopwrite)			 //if file still being written
			stopwrite=setTimeout(save(__dirname, filename),2000)
			return
		}
  }
  
  function msg(event) { mod.command.message(event); }
}