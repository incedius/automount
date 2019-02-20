const path = require('path'),
	  fs = require('fs')

module.exports = function AutoMount(mod) {
  let enabled=false,
    _gameId,
    _name='',
    config,
    fileopen=true,
    stopwrite,
    mounted=false,
    delay=0,
    setMount=false,
    currentMount=0,
    bigzero = BigInt(0),
    w,
    loc

  try{
    config = JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'), 'utf8'))
  }
  catch(e){
    config = JSON.parse(fs.readFileSync(path.join(__dirname,'config-default.json'), 'utf8'))
    save(config,"config.json")
  }
  
  mod.command.add(['automount','am'], {
    $none() {
      enabled=!enabled
      
      if(enabled){
        msg("enabled")
        delay=config.delay
      } else{
        msg("disabled")
        reset()
      }
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
  
  mod.hook('S_LOGIN', 12, event => { 
		_gameId = event.gameId
    _name = event.name
    currentMount = config.currentMount[_name]
    delay = config.delay
	})
  
  mod.hook('C_PLAYER_LOCATION', 5, event => {
    if(enabled && !mounted){
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
      
      delay--
      mount()
    }
  })
  
  mod.hook('S_MOUNT_VEHICLE', 2, event => {
    if (event.gameId != _gameId) return
    
    mounted = true
    
    if(setMount){
      currentMount = event.skill
      setMount = false
      config.currentMount[_name] = currentMount
      msg('Mount set to: ' + currentMount)
      save(config,"config.json")
    }
    
    if(enabled){
      reset()
    }
  })
  
  mod.hook('S_UNMOUNT_VEHICLE', 2, event => {
    if (event.gameId != _gameId) return
    
    mounted = false
    delay = config.delay
  })
  
  function mount(){
    if(enabled && delay<=0){
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
  
  function reset() {
    setMount=false
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