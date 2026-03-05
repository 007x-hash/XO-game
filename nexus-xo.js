// ══════════════════════════════════════════════════
// NEXUS XO — nexus-xo.js  (Anti-Cheat v2)
// ══════════════════════════════════════════════════

(function(){
    "use strict";
    
    // ══════════════════════════════════════════════════
    // TIER & POINTS CONFIG  (frozen at declaration)
    // ══════════════════════════════════════════════════
    const TIERS = Object.freeze([
      Object.freeze({name:"Unranked",    icon:"🥚", min:0,    max:49,       color:"#64748b", boardSize:3, winLen:3, rankedAI:"easy",        boardLabel:"3×3", avatarBg:"#1e293b"}),
      Object.freeze({name:"Bronze I",    icon:"🥉", min:50,   max:149,      color:"#cd7f32", boardSize:3, winLen:3, rankedAI:"easy",        boardLabel:"3×3", avatarBg:"#451a03"}),
      Object.freeze({name:"Bronze II",   icon:"🥉", min:150,  max:299,      color:"#cd7f32", boardSize:3, winLen:3, rankedAI:"medium",      boardLabel:"3×3", avatarBg:"#451a03"}),
      Object.freeze({name:"Silver I",    icon:"🥈", min:300,  max:499,      color:"#94a3b8", boardSize:3, winLen:3, rankedAI:"medium",      boardLabel:"3×3", avatarBg:"#1e293b"}),
      Object.freeze({name:"Silver II",   icon:"🥈", min:500,  max:749,      color:"#94a3b8", boardSize:3, winLen:3, rankedAI:"medium",      boardLabel:"3×3", avatarBg:"#1e293b"}),
      Object.freeze({name:"Gold I",      icon:"🥇", min:750,  max:1099,     color:"#fbbf24", boardSize:5, winLen:4, rankedAI:"hard",        boardLabel:"5×5", avatarBg:"#451a00"}),
      Object.freeze({name:"Gold II",     icon:"🥇", min:1100, max:1499,     color:"#fbbf24", boardSize:5, winLen:4, rankedAI:"hard",        boardLabel:"5×5", avatarBg:"#451a00"}),
      Object.freeze({name:"Platinum",    icon:"💎", min:1500, max:2199,     color:"#38bdf8", boardSize:6, winLen:4, rankedAI:"hard",        boardLabel:"6×6", avatarBg:"#0c1a2e"}),
      Object.freeze({name:"Diamond",     icon:"💠", min:2200, max:3199,     color:"#a78bfa", boardSize:7, winLen:5, rankedAI:"impossible",  boardLabel:"7×7", avatarBg:"#1a0a2e"}),
      Object.freeze({name:"Master",      icon:"👑", min:3200, max:4799,     color:"#f97316", boardSize:8, winLen:5, rankedAI:"master",     boardLabel:"8×8", avatarBg:"#2a0a00"}),
      Object.freeze({name:"Grandmaster", icon:"🔱", min:4800, max:Infinity, color:"#e11d48", boardSize:9, winLen:5, rankedAI:"godlike",     boardLabel:"9×9", avatarBg:"#1a0010"}),
    ]);
    
    const RANKED_PTS = Object.freeze([
      Object.freeze({win:20, draw:5,  loss:-10}), // Unranked
      Object.freeze({win:18, draw:5,  loss:-10}), // Bronze I
      Object.freeze({win:18, draw:5,  loss:-12}), // Bronze II
      Object.freeze({win:20, draw:6,  loss:-14}), // Silver I
      Object.freeze({win:20, draw:6,  loss:-16}), // Silver II
      Object.freeze({win:22, draw:7,  loss:-18}), // Gold I
      Object.freeze({win:22, draw:7,  loss:-20}), // Gold II
      Object.freeze({win:25, draw:8,  loss:-22}), // Platinum
      Object.freeze({win:28, draw:10, loss:-25}), // Diamond
      Object.freeze({win:32, draw:12, loss:-30}), // Master
      Object.freeze({win:38, draw:15, loss:-35}), // Grandmaster
    ]);
    
    const NORMAL_PTS = Object.freeze({
      win_easy:5, win_medium:15, win_hard:30,
      draw_easy:1, draw_medium:5, draw_hard:10,
    });
    
    // ══════════════════════════════════════════════════
    // AC CORE — all vars hidden inside IIFE closure
    // ══════════════════════════════════════════════════
    
    // [AC-1] Session-unique salt — regenerated every page load
    const _AC_SALT = "NX0_" + (()=>{
      let s=""; for(let i=0;i<16;i++) s+=Math.floor(Math.random()*36).toString(36); return s;
    })();
    
    // [AC-2] FNV-1a dual-accumulator hash (64-bit emulated)
    function _acHash(obj){
      const str=`${obj.X}|${obj.O}|${obj.D}|${obj.pts}|${_AC_SALT}`;
      let h1=0x811c9dc5, h2=0xc59d1c81;
      for(let i=0;i<str.length;i++){
        const c=str.charCodeAt(i);
        h1=Math.imul(h1^c,0x01000193)>>>0;
        h2=Math.imul(h2^(c<<4|c>>4),0x01000193)>>>0;
      }
      return h1.toString(16).padStart(8,"0")+h2.toString(16).padStart(8,"0");
    }
    
    // [AC-3] Score lives entirely in closure variables — not writable from console
    let _scoreX=0, _scoreO=0, _scoreD=0, _scorePts=0;
    function _readScore(){ return {X:_scoreX,O:_scoreO,D:_scoreD,pts:_scorePts}; }
    function _addWin(p){ if(p==="X")_scoreX++; else _scoreO++; }
    function _addDraw(){ _scoreD++; }
    function _addPts(d){ _scorePts=Math.max(0,_scorePts+d); }
    function _resetScore(){ _scoreX=0;_scoreO=0;_scoreD=0;_scorePts=0; }
    
    // [AC-4] Double-signature persistence
    function _storeScores(){
      const s=_readScore(), sig1=_acHash(s);
      const str2=`${s.pts}|${s.D}|${s.O}|${s.X}|${_AC_SALT}_v2`;
      let h=0xdeadbeef;
      for(let i=0;i<str2.length;i++) h=Math.imul(h^str2.charCodeAt(i),0x9e3779b9)>>>0;
      _safeStore("ttt-s5",{d:s,s1:sig1,s2:h.toString(16).padStart(8,"0")});
    }
    function _loadScores(){
      const raw=_safeLoad("ttt-s5",null);
      if(!raw){
        const leg=_safeLoad("ttt-s4",null);
        if(leg){const d=leg.data||leg;if(typeof d.X==="number"&&typeof d.pts==="number"){_scoreX=d.X|0;_scoreO=d.O|0;_scoreD=d.D|0;_scorePts=d.pts|0;_storeScores();return;}}
        return;
      }
      if(!raw.d||!raw.s1||!raw.s2){_warnTamper("missing fields");return;}
      const s=raw.d;
      if(["X","O","D","pts"].some(k=>typeof s[k]!=="number"||!Number.isFinite(s[k])||s[k]<0)){_warnTamper("types");return;}
      if(_acHash(s)!==raw.s1){_warnTamper("sig1");return;}
      const str2=`${s.pts}|${s.D}|${s.O}|${s.X}|${_AC_SALT}_v2`;
      let h=0xdeadbeef;
      for(let i=0;i<str2.length;i++) h=Math.imul(h^str2.charCodeAt(i),0x9e3779b9)>>>0;
      if(h.toString(16).padStart(8,"0")!==raw.s2){_warnTamper("sig2");return;}
      const MAX=TIERS[TIERS.length-1].min+5000;
      if(s.pts>MAX||s.X>9999||s.O>9999||s.D>9999){_warnTamper("bounds");return;}
      _scoreX=s.X|0;_scoreO=s.O|0;_scoreD=s.D|0;_scorePts=s.pts|0;
    }
    function _warnTamper(r){console.warn(`[AC] Tamper(${r}) — reset.`);_resetScore();_storeScores();}
    
    // [AC-5] One-time use token — consumed and nulled on first valid use
    let _moveToken=null, _tokenUsed=false;
    function _genToken(){
      _tokenUsed=false;
      _moveToken=_AC_SALT+Math.random().toString(36).slice(2)+performance.now().toString(36);
      return _moveToken;
    }
    function _consumeToken(t){
      if(_tokenUsed||!_moveToken||t!==_moveToken) return false;
      _tokenUsed=true; _moveToken=null; return true;
    }
    
    // [AC-6] Click cooldown + turn lock
    let _turnLock=false, _lastClickMs=0;
    const _COOLDOWN=150;
    
    // [AC-7] Move sequence counter — detects board-state injection
    let _boardSeq=0, _expectedSeq=0, _gameSession="";
    function _newSession(){
      _gameSession=_AC_SALT+Date.now().toString(36)+Math.random().toString(36).slice(2);
      _boardSeq=0; _expectedSeq=0;
    }
    function _advanceSeq(){ _boardSeq++; _expectedSeq=_boardSeq; }
    function _seqValid(){ return _boardSeq===_expectedSeq; }
    
    // [AC-8] Win-rate limiter (max 30 wins/min)
    const _winLog=[];
    function _checkWinRate(){
      const now=Date.now();
      while(_winLog.length&&now-_winLog[0]>60000) _winLog.shift();
      if(_winLog.length>=30){console.warn("[AC] Rate limit.");return false;}
      _winLog.push(now); return true;
    }
    
    // [AC-9] Replay protection — one score per session
    const _scoredSessions=new Set();
    function _canScoreSession(sid){
      if(_scoredSessions.has(sid)){console.warn("[AC] Already scored.");return false;}
      _scoredSessions.add(sid);
      if(_scoredSessions.size>200) _scoredSessions.delete(_scoredSessions.values().next().value);
      return true;
    }
    
    // Storage helpers
    function _safeStore(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.warn("Store fail",e);}}
    function _safeLoad(k,fb){try{const v=localStorage.getItem(k);return v?JSON.parse(v):fb;}catch(e){return fb;}}
    
    // ══════════════════════════════════════════════════
    // GAME STATE
    // ══════════════════════════════════════════════════
    let board=[],currentPlayer="X",gameActive=false;
    let mode=null,aiLevel="easy",rankedMode=false;
    let boardSize=3,winLen=3,winCombos=[];
    let _rankupTimer=null;
    let _currentMode=null,_currentRanked=false; // snapshot at game start
    
    let playerName=_safeLoad("ttt-name","");
    let lbRanked=_safeLoad("ttt-lb-r",[]);
    let lbCasual=_safeLoad("ttt-lb-c",[]);
    let currentLbTab="ranked";
    
    _loadScores();
    document.getElementById("playerName").value=playerName;
    init();
    
    // ══════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════
    function init(){updateName();_syncScoreUI();renderTiers();renderLeaderboard();createBoard();}
    function updateName(){
      playerName=document.getElementById("playerName").value.trim();
      _safeStore("ttt-name",playerName);
      document.getElementById("avatarLeft").textContent=(playerName||"?").slice(0,2).toUpperCase();
    }
    function getTier(pts){for(let i=TIERS.length-1;i>=0;i--)if(pts>=TIERS[i].min)return i;return 0;}
    function getRankedConfig(){const t=TIERS[getTier(_scorePts)];return{boardSize:t.boardSize,winLen:t.winLen,aiLevel:t.rankedAI};}
    
    // ══════════════════════════════════════════════════
    // RANKED TOGGLE
    // ══════════════════════════════════════════════════
    function toggleRanked(){
      if(!mode){showToast("⚠ SELECT A GAME MODE FIRST");return;}
      if(mode!=="ai"){showToast("⚠ RANKED · VS AI MODE ONLY");return;}
      rankedMode=!rankedMode;
      document.getElementById("rankedBtn").classList.toggle("active",rankedMode);
      document.getElementById("gamePanel").classList.toggle("ranked-active",rankedMode);
      document.getElementById("rankedConfigInfo").classList.toggle("show",rankedMode);
      document.getElementById("ptsPreview").classList.toggle("show",rankedMode);
      const aiLvlRow=document.getElementById("aiLevelArea").querySelector(".ai-level-row");
      const rankedLbl=document.getElementById("rankedAiLabel");
      if(rankedMode){aiLvlRow.style.display="none";rankedLbl.style.display="block";updateConfigChips();updatePtsPreview();showToast("⚔ RANKED MATCH ACTIVATED");}
      else{aiLvlRow.style.display="flex";rankedLbl.style.display="none";showToast("CASUAL MODE");}
      resetGame();
    }
    function updatePtsPreview(){
      const rp=RANKED_PTS[Math.min(getTier(_scorePts),RANKED_PTS.length-1)];
      document.getElementById("previewWin").textContent=`+${rp.win}`;
      document.getElementById("previewDraw").textContent=`+${rp.draw}`;
      document.getElementById("previewLoss").textContent=rp.loss;
    }
    function updateConfigChips(){
      const cfg=getRankedConfig(),m={easy:"EASY",medium:"MEDIUM",hard:"HARD",impossible:"💀 IMPOSSIBLE",godlike:"🔱 GODLIKE",master:"👑 MASTER"};
      document.getElementById("cfgSize").textContent=`${cfg.boardSize}×${cfg.boardSize}`;
      document.getElementById("cfgWin").textContent=`WIN ${cfg.winLen}`;
      document.getElementById("cfgAI").textContent=m[cfg.aiLevel]||cfg.aiLevel.toUpperCase();
    }
    
    // ══════════════════════════════════════════════════
    // MODE
    // ══════════════════════════════════════════════════
    function setMode(m,btn){
      mode=m;rankedMode=false;
      document.querySelectorAll(".mode-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("aiLevelArea").style.display=m==="ai"?"block":"none";
      document.getElementById("rankedBtn").classList.remove("active");
      document.getElementById("gamePanel").classList.remove("ranked-active");
      document.getElementById("rankedConfigInfo").classList.remove("show");
      document.getElementById("ptsPreview").classList.remove("show");
      document.getElementById("rankedAiLabel").style.display="none";
      if(m==="ai") document.getElementById("aiLevelArea").querySelector(".ai-level-row").style.display="flex";
      document.getElementById("chipOLbl").textContent=m==="ai"?"CPU":"P2";
      resetGame();
    }
    function setAILevel(lv,btn){
      aiLevel=lv;
      document.querySelectorAll(".ai-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      resetGame();
    }
    
    // ══════════════════════════════════════════════════
    // BOARD
    // ══════════════════════════════════════════════════
    function buildWinCombos(size,len){
      const c=[];
      for(let r=0;r<size;r++) for(let k=0;k<=size-len;k++){const l=[];for(let j=0;j<len;j++)l.push(r*size+k+j);c.push(l);}
      for(let col=0;col<size;col++) for(let r=0;r<=size-len;r++){const l=[];for(let j=0;j<len;j++)l.push((r+j)*size+col);c.push(l);}
      for(let r=0;r<=size-len;r++) for(let k=0;k<=size-len;k++){const l=[];for(let j=0;j<len;j++)l.push((r+j)*size+(k+j));c.push(l);}
      for(let r=0;r<=size-len;r++) for(let k=len-1;k<size;k++){const l=[];for(let j=0;j<len;j++)l.push((r+j)*size+(k-j));c.push(l);}
      return c;
    }
    function createBoard(){
      if(rankedMode){const cfg=getRankedConfig();boardSize=cfg.boardSize;winLen=cfg.winLen;}else{boardSize=3;winLen=3;}
      board=Array(boardSize*boardSize).fill("");
      winCombos=buildWinCombos(boardSize,winLen);
      document.getElementById("board").className=`board grid-${boardSize}`;
      renderBoard();
    }
    function renderBoard(){
      const el=document.getElementById("board");el.innerHTML="";
      board.forEach((v,i)=>{
        const d=document.createElement("div");
        d.className="cell appear";
        if(v) d.classList.add("taken");
        if(v==="X") d.classList.add("sym-x");
        if(v==="O") d.classList.add("sym-o");
        d.textContent=v;
        d.style.animationDelay=(i*0.02)+"s";
        d.onclick=()=>handleClick(i);
        el.appendChild(d);
      });
    }
    
    // ══════════════════════════════════════════════════
    // CLICK — all AC gates
    // ══════════════════════════════════════════════════
    function handleClick(i){
      const now=Date.now();
      if(now-_lastClickMs<_COOLDOWN) return;     // [AC-6] cooldown
      _lastClickMs=now;
      if(_turnLock) return;                       // [AC-6] turn lock
      if(typeof i!=="number"||i<0||i>=board.length) return;
      if(board[i]!==""||!gameActive) return;
      if(mode==="ai"&&currentPlayer!=="X") return;
    
      _turnLock=true;
      const tok=_genToken();                      // [AC-5] fresh token
      _doMove(i,currentPlayer,tok);
    
      if(_endGame()){_turnLock=false;return;}
      if(mode==="ai"&&currentPlayer==="O"){
        gameActive=false;_setThinking(true);
        setTimeout(()=>{
          _setThinking(false);gameActive=true;
          const aiTok=_genToken();
          _aiMove(aiTok);
          _turnLock=false;
        },420);
      } else {_turnLock=false;}
    }
    
    function _doMove(i,p,tok){
      if(!_consumeToken(tok)) return;             // [AC-5] one-time token
      if(typeof i!=="number"||i<0||i>=board.length||board[i]!=="") return;
      board[i]=p;
      _advanceSeq();                              // [AC-7] sequence++
      // Record player move for Master AI pattern analysis
      if(p==="X") _pp.recordMove(i);
      const cells=document.getElementById("board").children;
      if(cells[i]){
        cells[i].textContent=p;
        cells[i].classList.add("taken",p==="X"?"sym-x":"sym-o");
        cells[i].classList.remove("appear");void cells[i].offsetWidth;cells[i].classList.add("appear");
      }
    }
    function _setThinking(on){
      document.getElementById("thinkingLabel").classList.toggle("show",on);
      document.getElementById("status").style.display=on?"none":"";
    }
    function updateTurnChips(){
      document.getElementById("chipX").classList.toggle("active-turn",currentPlayer==="X");
      document.getElementById("chipO").classList.toggle("active-turn",currentPlayer==="O");
    }
    
    // ══════════════════════════════════════════════════
    // PLAYER PATTERN TRACKER  (Master AI brain)
    // สะสม pattern ผู้เล่นข้ามเกม — reset เมื่อ resetScore()
    // ══════════════════════════════════════════════════
    const _pp = {
      // Zone preference: index → frequency player placed piece
      zoneCounts: null,        // Float32Array(boardSize*boardSize), init per game-start
    
      // Direction bias: ผู้เล่นชอบสร้างเส้นแนวไหน
      // keys: "h"=horizontal, "v"=vertical, "d1"=diagonal↘, "d2"=diagonal↙
      dirBias:    {h:0, v:0, d1:0, d2:0},
    
      // Opening fingerprint: 3 moves แรก เพื่อทำนาย strategy
      openingMoves: [],        // [{idx, turn}]
    
      // Aggression index: สัดส่วนการวางแบบ "ต่อยอดตัวเอง" vs "ตอบโต้ AI"
      // 0 = reactive (ตามหลัง), 1 = aggressive (บุก)
      aggression: 0.5,
      aggrN:      0,           // sample count for rolling avg
    
      // Detected setup: เส้นที่ผู้เล่นกำลังสร้างในเกมนี้
      // [{combo, filled, danger}]  danger = filled/winLen ratio
      activeSetups: [],
    
      // "Ghost lines" — เส้นที่ AI บล็อกไปแล้ว ผู้เล่นมักลองซ้ำ
      blockedLines: [],
    
      // Game-level stats
      gamesPlayed:    0,
      totalMoveCount: 0,
    
      // Reset per-game state (keep cross-game learning)
      resetGame(){
        this.zoneCounts   = new Float32Array(boardSize*boardSize);
        this.openingMoves = [];
        this.activeSetups = [];
        this.blockedLines = [];
      },
    
      // Called on every player move
      recordMove(idx){
        if(!this.zoneCounts) this.resetGame();
        this.zoneCounts[idx]=(this.zoneCounts[idx]||0)+1;
        this.totalMoveCount++;
    
        // Track opening
        if(this.openingMoves.length<4) this.openingMoves.push(idx);
    
        // Direction: which combos does this move extend?
        for(const combo of winCombos){
          if(!combo.includes(idx)) continue;
          const vals=combo.map(i=>board[i]);
          const owned=vals.filter(v=>v==="X").length;
          if(owned<1) continue;
          // classify direction
          const r0=Math.floor(combo[0]/boardSize), r1=Math.floor(combo[combo.length-1]/boardSize);
          const c0=combo[0]%boardSize,             c1=combo[combo.length-1]%boardSize;
          const dr=r1-r0, dc=c1-c0;
          const dir= dr===0?"h": dc===0?"v": (dr>0&&dc>0)||(dr<0&&dc<0)?"d1":"d2";
          this.dirBias[dir]=(this.dirBias[dir]||0)+owned;
        }
    
        // Aggression: did player extend own line (agg) or play near AI (reactive)?
        let nearAI=false;
        const r=Math.floor(idx/boardSize),c=idx%boardSize;
        for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++){
          const nr=r+dr,nc=c+dc;
          if(nr>=0&&nr<boardSize&&nc>=0&&nc<boardSize&&board[nr*boardSize+nc]==="O"){nearAI=true;break;}
        }
        const alpha_new = nearAI?0:1;
        this.aggrN++;
        this.aggression += (alpha_new-this.aggression)/this.aggrN;
    
        // Update active setups
        this._scanSetups();
      },
    
      _scanSetups(){
        this.activeSetups=[];
        for(const combo of winCombos){
          const vals=combo.map(i=>board[i]);
          const filled=vals.filter(v=>v==="X").length;
          const blocked=vals.filter(v=>v==="O").length;
          if(filled===0||blocked>0) continue;
          const danger=filled/winLen;
          this.activeSetups.push({combo,filled,danger});
        }
        // Sort most dangerous first
        this.activeSetups.sort((a,b)=>b.danger-a.danger);
      },
    
      // Preferred zone: return top-N cell indices by historical frequency
      preferredZones(n=4){
        if(!this.zoneCounts) return [];
        return Array.from(this.zoneCounts)
          .map((v,i)=>({i,v}))
          .filter(x=>board[x.i]==="")
          .sort((a,b)=>b.v-a.v)
          .slice(0,n)
          .map(x=>x.i);
      },
    
      // Dominant direction: returns "h"|"v"|"d1"|"d2"
      dominantDir(){
        return Object.entries(this.dirBias).sort((a,b)=>b[1]-a[1])[0][0];
      },
    };
    
    // ══════════════════════════════════════════════════
    // AI DISPATCHER
    // ══════════════════════════════════════════════════
    function getEffectiveAI(){return rankedMode?getRankedConfig().aiLevel:aiLevel;}
    
    function _aiMove(tok){
      const level=getEffectiveAI();
      const empty=board.map((v,i)=>v===""?i:null).filter(v=>v!==null);
      if(!empty.length) return;
      let idx;
      if     (level==="easy")       idx=_easyMove();
      else if(level==="medium")     idx=_mediumMove();
      else if(level==="hard")       idx=_hardMove();
      else if(level==="impossible") idx=_impossibleMove();
      else if(level==="godlike")    idx=_godlikeMove();
      else                          idx=_masterMove();   // "master" level
      if(idx==null||idx===-1||board[idx]!=="") idx=_randomMove();
      _doMove(idx,"O",tok);
      _endGame();
    }
    
    // ── Easy ──────────────────────────────────────────
    function _easyMove(){
      const w=_findWin(board,"O"); if(w!==-1) return w;
      if(Math.random()<0.60){ const bl=_findWin(board,"X"); if(bl!==-1) return bl; }
      return _randomMove();
    }
    
    // ── Medium ────────────────────────────────────────
    function _mediumMove(){
      const w=_findWin(board,"O"); if(w!==-1) return w;
      const bl=_findWin(board,"X"); if(bl!==-1) return bl;
      if(Math.random()<0.70){ const fk=_findFork(board,"O"); if(fk!==-1) return fk; }
      if(Math.random()<0.60){ const bfk=_findFork(board,"X"); if(bfk!==-1) return bfk; }
      if(boardSize===3) return _minimax3([...board],"O").index??_randomMove();
      return _heuristicMove("O");
    }
    
    // ── Hard ──────────────────────────────────────────
    function _hardMove(){
      const w=_findWin(board,"O"); if(w!==-1) return w;
      const bl=_findWin(board,"X"); if(bl!==-1) return bl;
      const fk=_findFork(board,"O"); if(fk!==-1) return fk;
      const bfk=_findFork(board,"X"); if(bfk!==-1) return bfk;
      if(boardSize===3) return _minimax3([...board],"O").index??_randomMove();
      const filled=board.filter(v=>v!=="").length;
      let depth = boardSize===5?(filled<8?4:5): boardSize===6?(filled<6?3:4):(filled<8?2:3);
      const result=_alphaBeta([...board],depth,-Infinity,Infinity,true);
      return result.index!==-1?result.index:_heuristicMove("O");
    }
    
    // ── Impossible ────────────────────────────────────
    function _impossibleMove(){
      const w=_findWin(board,"O"); if(w!==-1) return w;
      const bl=_findWin(board,"X"); if(bl!==-1) return bl;
      const dt=_findDoubleThreat(board,"O"); if(dt!==-1) return dt;
      const bdt=_findDoubleThreat(board,"X"); if(bdt!==-1) return bdt;
      const fk=_findFork(board,"O"); if(fk!==-1) return fk;
      const bfk=_findFork(board,"X"); if(bfk!==-1) return bfk;
      const filled=board.filter(v=>v!=="").length;
      let depth;
      if(boardSize<=3)       depth=9;
      else if(boardSize===5) depth=filled<6?4:filled<14?5:6;
      else if(boardSize===6) depth=filled<6?3:filled<16?4:5;
      else if(boardSize===7) depth=filled<8?3:filled<18?4:4;
      else                   depth=filled<10?2:3;
      const result=_alphaBeta([...board],depth,-Infinity,Infinity,true);
      return result.index!==-1?result.index:_heuristicMove("O");
    }
    
    // ── Godlike ───────────────────────────────────────
    function _godlikeMove(){
      const w=_findWin(board,"O"); if(w!==-1) return w;
      const bl=_findWin(board,"X"); if(bl!==-1) return bl;
      const dt=_findDoubleThreat(board,"O"); if(dt!==-1) return dt;
      const bdt=_findDoubleThreat(board,"X"); if(bdt!==-1) return bdt;
      const fk=_findFork(board,"O"); if(fk!==-1) return fk;
      const bfk=_findFork(board,"X"); if(bfk!==-1) return bfk;
      const filled=board.filter(v=>v!=="").length;
      if(filled<=2){
        const cen=Math.floor(boardSize/2)*boardSize+Math.floor(boardSize/2);
        if(board[cen]==="") return cen;
      }
      let depth;
      if(boardSize<=3)       depth=9;
      else if(boardSize===5) depth=filled<6?5:filled<14?6:7;
      else if(boardSize===6) depth=filled<6?4:filled<16?5:6;
      else if(boardSize===7) depth=filled<8?4:5;
      else if(boardSize===8) depth=filled<10?3:4;
      else                   depth=filled<12?3:4;
      const result=_alphaBeta([...board],depth,-Infinity,Infinity,true);
      return result.index!==-1?result.index:_heuristicMove("O");
    }
    
    // ══════════════════════════════════════════════════
    // MASTER AI — psychological + pattern-based
    // ══════════════════════════════════════════════════
    /*
      Priority stack (checked top-to-bottom, first hit wins):
      [P0] Own immediate win
      [P1] DANGER SCAN — block ANY line with dangerScore >= threshold
           (never-lose guarantee: checks n-1, n-2 progressively)
      [P2] Create double-threat (win-in-2 fork)
      [P3] Build own fork
      [P4] Pattern intercept — cut player's preferred zone / dominant dir
      [P5] Pressure move — play INTO player's preferred zone to crowd it
      [P6] Predictive block — cells player is "building toward" based on active setups
      [P7] Alpha-beta with pattern-biased eval
    */
    function _masterMove(){
      // [P0] Own immediate win — always
      const w=_findWin(board,"O");
      if(w!==-1) return w;
    
      // [P1] Never-lose: danger scan with escalating threshold
      const danger=_dangerScan();
      if(danger!==-1) return danger;
    
      // [P2] Create double-threat (unblockable fork)
      const dt=_findDoubleThreat(board,"O");
      if(dt!==-1) return dt;
    
      // [P3] Block player's double-threat first
      const bdt=_findDoubleThreat(board,"X");
      if(bdt!==-1) return bdt;
    
      // [P4] Own fork
      const fk=_findFork(board,"O");
      if(fk!==-1) return fk;
    
      // [P5] Block player fork
      const bfk=_findFork(board,"X");
      if(bfk!==-1) return bfk;
    
      // [P6] Pattern intercept — disrupt player's most dangerous active setup
      const intercept=_patternIntercept();
      if(intercept!==-1) return intercept;
    
      // [P7] Alpha-beta with pattern-aware eval
      const filled=board.filter(v=>v!=="").length;
      let depth = filled<10?4: filled<20?5:5;
      const result=_alphaBetaMaster([...board],depth,-Infinity,Infinity,true);
      if(result.index!==-1) return result.index;
    
      // [P8] Pressure: crowd player's preferred zone
      const pressure=_pressureMove();
      if(pressure!==-1) return pressure;
    
      return _heuristicMove("O");
    }
    
    // ── Danger Scan: find most threatening player line and block it
    // Returns block cell or -1 if no threat above threshold
    function _dangerScan(){
      // Build danger map: for each empty cell, what's the max threat it completes
      const dangerMap=new Float32Array(board.length);
    
      for(const combo of winCombos){
        const vals=combo.map(i=>board[i]);
        const xCount=vals.filter(v=>v==="X").length;
        const oCount=vals.filter(v=>v==="O").length;
        if(oCount>0||xCount===0) continue; // blocked or empty line
    
        // Danger score: exponential — n-1 is critical, n-2 is urgent
        const empty=combo.filter(i=>board[i]==="");
        const dScore = xCount===winLen-1 ? 10000 :   // win-in-1: must block
                       xCount===winLen-2 ? 200  :     // win-in-2: high priority
                       xCount===winLen-3 ? 15   : 1;  // building up
    
        for(const idx of empty){
          dangerMap[idx]=Math.max(dangerMap[idx],dScore);
        }
      }
    
      // Find max danger cell
      let maxDanger=0, bestCell=-1;
      for(let i=0;i<dangerMap.length;i++){
        if(board[i]===""&&dangerMap[i]>maxDanger){maxDanger=dangerMap[i];bestCell=i;}
      }
    
      // Only block if danger exceeds threshold
      // win-in-1 (10000): always block
      // win-in-2 (200): block if player seems aggressive or has established pattern
      if(maxDanger>=10000) return bestCell;
      if(maxDanger>=200){
        // Check if multiple such threats exist (unblockable risk)
        const criticalCells=[];
        for(let i=0;i<dangerMap.length;i++) if(board[i]===""&&dangerMap[i]>=200) criticalCells.push(i);
        if(criticalCells.length>=2) return criticalCells[0]; // pick first — both are urgent
        // Single win-in-2: block if player aggression is high OR has pattern in that direction
        if(_pp.aggression>0.55) return bestCell;
        // Check if this cell lies in player's dominant direction
        const domDir=_pp.dominantDir();
        for(const combo of winCombos){
          if(!combo.includes(bestCell)) continue;
          const r0=Math.floor(combo[0]/boardSize),r1=Math.floor(combo[combo.length-1]/boardSize);
          const c0=combo[0]%boardSize,c1=combo[combo.length-1]%boardSize;
          const dr=r1-r0,dc=c1-c0;
          const dir= dr===0?"h": dc===0?"v": (dr>0&&dc>0)||(dr<0&&dc<0)?"d1":"d2";
          if(dir===domDir) return bestCell; // in player's comfort zone — block immediately
        }
      }
      if(maxDanger>=15){
        // Proactive: block win-in-3 that aligns with player's known preferred zones
        const prefZones=new Set(_pp.preferredZones(6));
        if(prefZones.has(bestCell)) return bestCell;
      }
      return -1;
    }
    
    // ── Pattern intercept: cut the most dangerous active setup
    function _patternIntercept(){
      if(!_pp.activeSetups.length) return -1;
    
      const domDir=_pp.dominantDir();
      const prefZones=new Set(_pp.preferredZones(5));
    
      // Score each active setup by combination of: danger + direction match + zone match
      let bestScore=-Infinity, bestCell=-1;
    
      for(const setup of _pp.activeSetups){
        const {combo,filled,danger}=setup;
        // Find empty cells in this combo
        const emptyCells=combo.filter(i=>board[i]==="");
        if(!emptyCells.length) continue;
    
        // Direction of this combo
        const r0=Math.floor(combo[0]/boardSize),r1=Math.floor(combo[combo.length-1]/boardSize);
        const c0=combo[0]%boardSize,c1=combo[combo.length-1]%boardSize;
        const dr=r1-r0,dc=c1-c0;
        const dir= dr===0?"h": dc===0?"v": (dr>0&&dc>0)||(dr<0&&dc<0)?"d1":"d2";
    
        const dirBonus  = dir===domDir?1.5:1.0;
        const zoneBonus = emptyCells.some(i=>prefZones.has(i))?1.4:1.0;
    
        const score = danger * dirBonus * zoneBonus * (filled/winLen);
    
        // Pick the empty cell in this combo that best blocks AND is strategic for AI
        for(const idx of emptyCells){
          const cellScore = score + _scoreCell(idx,"O",board)*0.01;
          if(cellScore>bestScore&&board[idx]===""){bestScore=cellScore;bestCell=idx;}
        }
      }
    
      // Only intercept if danger is meaningful (avoid wasting moves on trivial setups)
      if(bestScore>0.3&&bestCell!==-1) return bestCell;
      return -1;
    }
    
    // ── Pressure move: play into player's most-used zone to crowd future options
    function _pressureMove(){
      const prefZones=_pp.preferredZones(6);
      for(const idx of prefZones){
        if(board[idx]===""){
          // Only pressure if it's also a reasonable move for us
          const s=_scoreCell(idx,"O",board);
          if(s>0) return idx;
        }
      }
      return -1;
    }
    
    // ── Alpha-beta with pattern-aware evaluation for Master
    function _alphaBetaMaster(b,depth,alpha,beta,isMax){
      if(_checkWin(b,"O"))return{score:10000+depth,index:-1};
      if(_checkWin(b,"X"))return{score:-10000-depth,index:-1};
      const cands=_getCandidates(b);
      if(depth===0||!cands.length)return{score:_evalBoardMaster(b),index:-1};
      let bestIdx=-1;
      if(isMax){
        let best=-Infinity;
        for(const i of cands){
          b[i]="O";if(_checkWin(b,"O")){b[i]="";return{score:10000+depth,index:i};}
          const r=_alphaBetaMaster(b,depth-1,alpha,beta,false);b[i]="";
          if(r.score>best){best=r.score;bestIdx=i;}alpha=Math.max(alpha,best);if(beta<=alpha)break;
        }
        return{score:best,index:bestIdx};
      } else {
        let best=Infinity;
        for(const i of cands){
          b[i]="X";if(_checkWin(b,"X")){b[i]="";return{score:-10000-depth,index:i};}
          const r=_alphaBetaMaster(b,depth-1,alpha,beta,true);b[i]="";
          if(r.score<best){best=r.score;bestIdx=i;}beta=Math.min(beta,best);if(beta<=alpha)break;
        }
        return{score:best,index:bestIdx};
      }
    }
    
    // ── Pattern-aware board evaluator: penalises player's known-preferred directions extra
    function _evalBoardMaster(b){
      const domDir=_pp.dominantDir();
      const prefZones=_pp.preferredZones(6);
      const prefSet=new Set(prefZones);
      let s=0;
    
      for(const c of winCombos){
        const v=c.map(i=>b[i]);
        const o=v.filter(x=>x==="O").length,x=v.filter(x=>x==="X").length;
        const oe=v.filter(x=>x==="").length;
        if(x===0&&o>0){
          s+=Math.pow(10,o);
          if(o===winLen-1&&oe===1) s+=500;
          if(o===winLen-2&&oe===2) s+=60;
        }
        if(o===0&&x>0){
          // Extra penalty if this combo aligns with player's dominant direction
          const r0=Math.floor(c[0]/boardSize),r1=Math.floor(c[c.length-1]/boardSize);
          const c0i=c[0]%boardSize,c1i=c[c.length-1]%boardSize;
          const dr=r1-r0,dc=c1i-c0i;
          const dir= dr===0?"h": dc===0?"v": (dr>0&&dc>0)||(dr<0&&dc<0)?"d1":"d2";
          const dirMult = dir===domDir?1.6:1.2;
    
          s-=Math.pow(10,x)*dirMult;
          if(x===winLen-1&&oe===1) s-=900;
          if(x===winLen-2&&oe===2) s-=100;
    
          // Extra penalty if threat is in player's preferred zone
          const inPrefZone=c.some(i=>prefSet.has(i));
          if(inPrefZone) s-=x*40;
        }
      }
    
      // Centrality
      const cen=Math.floor(boardSize/2);
      for(let r=0;r<boardSize;r++) for(let c=0;c<boardSize;c++){
        const d=Math.abs(r-cen)+Math.abs(c-cen);
        if(b[r*boardSize+c]==="O") s+=(boardSize-d)*1.5;
        if(b[r*boardSize+c]==="X") s-=(boardSize-d)*1.2;
      }
    
      // Bonus: AI occupies player's preferred zones (crowd them out)
      for(const idx of prefZones){
        if(b[idx]==="O") s+=25;
        if(b[idx]==="X") s-=35; // penalty: player in preferred zone is dangerous
      }
      return s;
    }
    
    // ── Find a cell that creates 2 simultaneous threats
    function _findDoubleThreat(b,p){
      const e=b.map((v,i)=>v===""?i:null).filter(v=>v!==null);
      for(const i of e){
        b[i]=p;
        let threats=0;
        for(const combo of winCombos){
          if(!combo.includes(i)) continue;
          const vals=combo.map(j=>b[j]);
          const cnt=vals.filter(v=>v===p).length;
          const empties=vals.filter(v=>v==="").length;
          if(cnt===winLen-1&&empties===1) threats++;
        }
        b[i]="";
        if(threats>=2) return i;
      }
      return -1;
    }
    
    function _randomMove(){const e=board.map((v,i)=>v===""?i:null).filter(v=>v!==null);return e[Math.floor(Math.random()*e.length)];}
    function _smartMove(){if(boardSize===3)return _minimax3([...board],"O").index??_randomMove();return _heuristicMove("O");}
    
    function _getCandidates(b){
      const sz=boardSize,occ=new Set(b.map((v,i)=>v!==""?i:null).filter(v=>v!==null));
      if(occ.size===0)return[Math.floor(sz*sz/2)];
      const cands=new Set();
      for(const idx of occ){
        const r=Math.floor(idx/sz),c=idx%sz;
        for(let dr=-2;dr<=2;dr++) for(let dc=-2;dc<=2;dc++){
          const nr=r+dr,nc=c+dc;
          if(nr>=0&&nr<sz&&nc>=0&&nc<sz&&b[nr*sz+nc]==="") cands.add(nr*sz+nc);
        }
      }
      return[...cands].sort((a,z)=>_scoreCell(z,"O",b)-_scoreCell(a,"O",b));
    }
    
    // Standard alpha-beta (used by easy–impossible)
    function _alphaBeta(b,depth,alpha,beta,isMax){
      if(_checkWin(b,"O"))return{score:10000+depth,index:-1};
      if(_checkWin(b,"X"))return{score:-10000-depth,index:-1};
      const cands=_getCandidates(b);
      if(depth===0||!cands.length)return{score:_evalBoard(b),index:-1};
      let bestIdx=-1;
      if(isMax){
        let best=-Infinity;
        for(const i of cands){
          b[i]="O";if(_checkWin(b,"O")){b[i]="";return{score:10000+depth,index:i};}
          const r=_alphaBeta(b,depth-1,alpha,beta,false);b[i]="";
          if(r.score>best){best=r.score;bestIdx=i;}alpha=Math.max(alpha,best);if(beta<=alpha)break;
        }
        return{score:best,index:bestIdx};
      } else {
        let best=Infinity;
        for(const i of cands){
          b[i]="X";if(_checkWin(b,"X")){b[i]="";return{score:-10000-depth,index:i};}
          const r=_alphaBeta(b,depth-1,alpha,beta,true);b[i]="";
          if(r.score<best){best=r.score;bestIdx=i;}beta=Math.min(beta,best);if(beta<=alpha)break;
        }
        return{score:best,index:bestIdx};
      }
    }
    
    // Standard board evaluator (easy–impossible)
    function _evalBoard(b){
      let s=0;
      for(const c of winCombos){
        const v=c.map(i=>b[i]);
        const o=v.filter(x=>x==="O").length,x=v.filter(x=>x==="X").length;
        const oe=v.filter(x=>x==="").length;
        if(x===0&&o>0){s+=Math.pow(10,o);if(o===winLen-1&&oe===1)s+=500;if(o===winLen-2&&oe===2)s+=60;}
        if(o===0&&x>0){s-=Math.pow(10,x)*1.2;if(x===winLen-1&&oe===1)s-=800;if(x===winLen-2&&oe===2)s-=80;}
      }
      const cen=Math.floor(boardSize/2);
      for(let r=0;r<boardSize;r++) for(let c=0;c<boardSize;c++){
        const d=Math.abs(r-cen)+Math.abs(c-cen);
        if(b[r*boardSize+c]==="O")s+=(boardSize-d)*1.5;
        if(b[r*boardSize+c]==="X")s-=(boardSize-d)*1.2;
      }
      return s;
    }
    
    function _minimax3(b,p){
      const e=b.map((v,i)=>v===""?i:null).filter(v=>v!==null);
      if(_checkWin(b,"X"))return{score:-10};if(_checkWin(b,"O"))return{score:10};if(!e.length)return{score:0};
      const moves=[];for(const i of e){b[i]=p;moves.push({index:i,score:_minimax3(b,p==="O"?"X":"O").score});b[i]="";}
      return p==="O"?moves.reduce((a,b)=>b.score>a.score?b:a):moves.reduce((a,b)=>b.score<a.score?b:a);
    }
    
    function _heuristicMove(ai){
      const hu=ai==="O"?"X":"O";
      let w=_findWin(board,ai);if(w!==-1)return w;
      let bl=_findWin(board,hu);if(bl!==-1)return bl;
      const dt=_findDoubleThreat(board,ai);if(dt!==-1)return dt;
      const bdt=_findDoubleThreat(board,hu);if(bdt!==-1)return bdt;
      const fk=_findFork(board,ai);if(fk!==-1)return fk;
      const bfk=_findFork(board,hu);if(bfk!==-1)return bfk;
      const e=board.map((v,i)=>v===""?i:null).filter(v=>v!==null);
      let best=-1,bestS=-Infinity;
      for(const i of e){const s=_scoreCell(i,ai,board);if(s>bestS){bestS=s;best=i;}}
      return best!==-1?best:_randomMove();
    }
    function _findWin(b,p){const e=b.map((v,i)=>v===""?i:null).filter(v=>v!==null);for(const i of e){b[i]=p;if(_checkWin(b,p)){b[i]="";return i;}b[i]="";}return -1;}
    function _findFork(b,p){
      const e=b.map((v,i)=>v===""?i:null).filter(v=>v!==null);
      for(const i of e){b[i]=p;let t=0;const rem=e.filter(x=>x!==i);for(const i2 of rem){b[i2]=p;if(_checkWin(b,p))t++;b[i2]="";}b[i]="";if(t>=2)return i;}
      return -1;
    }
    function _scoreCell(idx,p,b=board){
      const opp=p==="O"?"X":"O";let s=0;
      const r=Math.floor(idx/boardSize),c=idx%boardSize,cen=(boardSize-1)/2;
      s+=(boardSize-(Math.abs(r-cen)+Math.abs(c-cen)))*2.5;
      for(const combo of winCombos){
        if(!combo.includes(idx))continue;
        const vals=combo.map(i=>b[i]);
        if(vals.includes(opp))continue;
        const own=vals.filter(v=>v===p).length;
        s+=Math.pow(3,own)*2;
        const firstIdx=combo[0],lastIdx=combo[combo.length-1];
        const hasOpenLeft =firstIdx%boardSize>0&&b[firstIdx-1]==="";
        const hasOpenRight=lastIdx%boardSize<boardSize-1&&b[lastIdx+1]==="";
        if(hasOpenLeft||hasOpenRight) s+=own*4;
      }
      return s;
    }
    function _checkWin(b,p){return winCombos.some(c=>c.every(i=>b[i]===p));}
    function highlightWin(){
      const cells=document.getElementById("board").children;
      for(const c of winCombos)if(c.every(i=>board[i]===currentPlayer))c.forEach(i=>cells[i]&&cells[i].classList.add("win"));
    }
    
    // ══════════════════════════════════════════════════
    // GAME END  (AC-gated)
    // ══════════════════════════════════════════════════
    function _endGame(){
      if(_checkWin(board,currentPlayer)){
        highlightWin();
        if(!_seqValid()){console.warn("[AC] Seq mismatch.");gameActive=false;return true;}  // [AC-7]
        if(!_canScoreSession(_gameSession)){gameActive=false;return true;}                  // [AC-9]
        const canScore=_checkWinRate();                                                     // [AC-8]
        const _mode=_currentMode,_ranked=_currentRanked;                                   // snapshot
        _addWin(currentPlayer);
        let delta=0;
        if(canScore){
          if(_ranked&&_mode==="ai"){const rp=RANKED_PTS[Math.min(getTier(_scorePts),RANKED_PTS.length-1)];delta=currentPlayer==="X"?rp.win:rp.loss;}
          else if(_mode==="ai"&&currentPlayer==="X"){delta=NORMAL_PTS[`win_${aiLevel}`]||0;}
        }
        const oldTi=getTier(_scorePts);
        _applyPoints(delta);_saveScore();
        setTimeout(()=>showResult(currentPlayer==="X"?"victory":"defeat",delta,oldTi),600);
        gameActive=false;return true;
      }
      if(!board.includes("")){
        if(!_seqValid()||!_canScoreSession(_gameSession)){gameActive=false;return true;}
        const canScore=_checkWinRate();
        const _mode=_currentMode,_ranked=_currentRanked;
        _addDraw();
        let delta=0;
        if(canScore){
          if(_ranked&&_mode==="ai"){const rp=RANKED_PTS[Math.min(getTier(_scorePts),RANKED_PTS.length-1)];delta=rp.draw;}
          else if(_mode==="ai"){delta=NORMAL_PTS[`draw_${aiLevel}`]||0;}
        }
        const oldTi=getTier(_scorePts);
        _applyPoints(delta);_saveScore();
        setTimeout(()=>showResult("draw",delta,oldTi),600);
        gameActive=false;return true;
      }
      currentPlayer=currentPlayer==="X"?"O":"X";
      updateStatus();updateTurnChips();return false;
    }
    function updateStatus(){
      const st=document.getElementById("status");
      if(!mode){st.textContent="SELECT MODE";return;}
      if(rankedMode) st.textContent=`⚔ RANKED · ${boardSize}×${boardSize}`;
      else if(mode==="ai") st.textContent=`VS AI · ${aiLevel.toUpperCase()}`;
      else st.textContent=`PLAYER ${currentPlayer} TURN`;
    }
    
    // ══════════════════════════════════════════════════
    // POINTS
    // ══════════════════════════════════════════════════
    function _applyPoints(delta){
      const oldTi=getTier(_scorePts);_addPts(delta);
      const newTi=getTier(_scorePts);_floatXP(delta);
      if(newTi>oldTi){
        const t=TIERS[newTi];
        setTimeout(()=>showToast(`⚡ RANK UP! ${t.icon} ${t.name.toUpperCase()}`),400);
        if(rankedMode) setTimeout(()=>{updateConfigChips();updatePtsPreview();},500);
        clearTimeout(_rankupTimer);
        _rankupTimer=setTimeout(()=>{_rankupTimer=null;resetGame();},2800);
      }
    }
    function _floatXP(delta){
      const el=document.createElement("div");el.className="xp-float";
      el.textContent=(delta>=0?"+":"")+delta+" PTS";
      el.style.color=delta>=0?"var(--neon-green)":"var(--neon-red)";
      el.style.left="50%";el.style.top="35%";el.style.transform="translateX(-50%)";
      el.style.textShadow=`0 0 20px ${delta>=0?"rgba(52,211,153,0.7)":"rgba(248,113,113,0.7)"}`;
      document.body.appendChild(el);setTimeout(()=>el.remove(),1400);
    }
    function spawnParticles(){
      const colors=["var(--neon-purple)","var(--neon-blue)","var(--neon-cyan)","var(--neon-pink)"];
      for(let i=0;i<20;i++){
        const p=document.createElement("div");p.className="rankup-particle";
        const angle=Math.random()*Math.PI*2,dist=60+Math.random()*120;
        p.style.cssText=`left:50%;top:50%;background:${colors[i%4]};--particle-end:translate(calc(-50% + ${Math.cos(angle)*dist}px),calc(-50% + ${Math.sin(angle)*dist}px));animation-delay:${Math.random()*0.3}s;animation-duration:${0.6+Math.random()*0.4}s;`;
        document.getElementById("popup").appendChild(p);setTimeout(()=>p.remove(),1200);
      }
    }
    function showToast(msg){
      const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");
      clearTimeout(window._toastTimer);window._toastTimer=setTimeout(()=>t.classList.remove("show"),2800);
    }
    
    // ══════════════════════════════════════════════════
    // RESULT POPUP
    // ══════════════════════════════════════════════════
    function showResult(type,delta,oldTi){
      const newTi=getTier(_scorePts),didRankUp=newTi>oldTi;
      const popup=document.getElementById("popup");
      popup.className="popup "+type+(didRankUp?" rankup":"");
      document.getElementById("popupEyebrow").textContent=rankedMode?"RANKED MATCH RESULT":"MATCH RESULT";
      document.getElementById("popupTitle").textContent={victory:"VICTORY",defeat:"DEFEAT",draw:"DRAW"}[type];
      if(type==="victory") document.getElementById("popupSubtitle").textContent=`${playerName||"YOU"} WINS! 🎉`;
      else if(type==="defeat") document.getElementById("popupSubtitle").textContent="CPU WINS THIS ROUND";
      else document.getElementById("popupSubtitle").textContent="IT'S A DRAW";
      const xpEl=document.getElementById("popupXpDelta");
      xpEl.className="xp-delta "+(delta>0?"positive":delta<0?"negative":"");
      xpEl.textContent=(delta>0?"+":"")+delta+" PTS";
      const ti=getTier(_scorePts),tier=TIERS[ti],next=TIERS[ti+1];
      const pct=next?((_scorePts-tier.min)/(next.min-tier.min))*100:100;
      document.getElementById("popupRankLabel").textContent=tier.name;
      document.getElementById("popupPtsLabel").textContent=_scorePts+" pts";
      const fill=document.getElementById("popupXpFill");fill.style.width="0%";
      setTimeout(()=>fill.style.width=Math.min(100,pct)+"%",200);
      const banner=document.getElementById("rankupBanner");
      if(didRankUp){banner.textContent=`⚡ RANK UP → ${TIERS[newTi].icon} ${TIERS[newTi].name.toUpperCase()}`;banner.classList.add("show");setTimeout(()=>spawnParticles(),300);}
      else banner.classList.remove("show");
      document.getElementById("popupOverlay").classList.add("show");
    }
    function popupPlayAgain(){closePopup();resetGame();}
    function closePopup(){document.getElementById("popupOverlay").classList.remove("show");}
    
    // ══════════════════════════════════════════════════
    // SAVE / RENDER
    // ══════════════════════════════════════════════════
    function _saveScore(){_storeScores();_syncScoreUI();}
    function _syncScoreUI(){
      const s=_readScore();
      document.getElementById("sx").textContent=s.X;document.getElementById("so").textContent=s.O;
      document.getElementById("sd").textContent=s.D;document.getElementById("spTotal").textContent=s.pts;
      _updateRankDisplay();renderTiers();_updateStats();
    }
    function _updateStats(){
      const s=_readScore(),total=s.X+s.O+s.D,wr=total>0?Math.round((s.X/total)*100):0;
      document.getElementById("statWinrate").textContent=wr+"%";
      document.getElementById("statTotal").textContent=total;
    }
    function _updateRankDisplay(){
      const pts=_scorePts,ti=getTier(pts),tier=TIERS[ti],next=TIERS[ti+1];
      document.getElementById("rankIcon").textContent=tier.icon;
      document.getElementById("rankTitle").textContent=tier.name.toUpperCase();
      const aiLbl={easy:"Easy",medium:"Medium",hard:"Hard",impossible:"💀 Impossible",godlike:"🔱 Godlike",master:"👑 Master"}[tier.rankedAI]||tier.rankedAI;
      document.getElementById("rankSub").textContent=`${pts} pts · ${tier.boardLabel} · ${aiLbl} AI (Ranked)`;
      const pct=next?((pts-tier.min)/(next.min-tier.min))*100:100;
      document.getElementById("xpBarFill").style.width=Math.min(100,pct)+"%";
      document.getElementById("xpBarCur").textContent=pts;
      document.getElementById("xpBarNext").textContent=next?next.min:"MAX";
    }
    function renderTiers(){
      const ti=getTier(_scorePts),aiMap={easy:"🟢",medium:"🟡",hard:"🔴",impossible:"💀"};
      document.getElementById("tierList").innerHTML=TIERS.map((t,i)=>{
        const isCur=i===ti,unlocked=_scorePts>=t.min,col=unlocked?t.color:"var(--dim)";
        return`<div class="tier-row${isCur?" current":""}">
          <span class="tier-icon">${t.icon}</span>
          <div class="tier-info">
            <div class="tier-name-txt" style="color:${col}">${t.name}</div>
            <div class="tier-details-txt">${t.min}–${t.max===Infinity?"∞":t.max} pts · ${aiMap[t.rankedAI]} · ${t.boardLabel}</div>
          </div>
          ${isCur?'<span class="tier-now">NOW</span>':''}
        </div>`;
      }).join("");
    }
    function switchLbTab(tab,btn){
      currentLbTab=tab;document.querySelectorAll(".lb-tab").forEach(b=>b.classList.remove("active"));btn.classList.add("active");renderLeaderboard();
    }
    const AVATAR_COLORS=["#1d4ed8","#7c3aed","#0891b2","#be185d","#047857","#b45309","#9f1239","#1e3a5f"];
    function getAvatarColor(n){let h=0;for(const c of(n||"?"))h=(h*31+c.charCodeAt(0))%8;return AVATAR_COLORS[h];}
    function renderLeaderboard(){
      const lb=currentLbTab==="ranked"?lbRanked:lbCasual,sorted=[...lb].sort((a,b)=>b.pts-a.pts).slice(0,5),medals=["🥇","🥈","🥉"],el=document.getElementById("lbList");
      if(!sorted.length){el.innerHTML=`<div class="lb-empty">No data yet.<br>Play and save to appear here.</div>`;return;}
      el.innerHTML=sorted.map((e,i)=>{
        const tier=TIERS[getTier(e.pts)];
        return`<div class="lb-item" style="animation:cell-appear 0.25s ${i*0.06}s both">
          <div class="lb-pos">${medals[i]||(i+1)}</div>
          <div class="lb-avatar" style="background:${getAvatarColor(e.name)}">${(e.name||"?").slice(0,2).toUpperCase()}</div>
          <div class="lb-name-block"><div class="lb-name">${e.name||"Anonymous"}</div><div class="lb-tier-row">${tier.icon} ${tier.name}</div></div>
          <div class="lb-pts-block"><div class="lb-pts-num">${e.pts}</div><div class="lb-pts-lbl">PTS</div></div>
        </div>`;
      }).join("");
    }
    function saveToLeaderboard(){
      const name=playerName||"Anonymous",lb=rankedMode?lbRanked:lbCasual,key=rankedMode?"ttt-lb-r":"ttt-lb-c";
      const ex=lb.find(e=>e.name===name);
      if(ex){if(_scorePts>ex.pts)ex.pts=_scorePts;}else lb.push({name,pts:_scorePts});
      lb.sort((a,b)=>b.pts-a.pts);if(lb.length>20)lb.length=20;
      _safeStore(key,lb);renderLeaderboard();
      showToast(`✓ SAVED TO ${rankedMode?"RANKED":"CASUAL"} LEADERBOARD`);
    }
    
    // ══════════════════════════════════════════════════
    // RESET
    // ══════════════════════════════════════════════════
    function resetGame(){
      clearTimeout(_rankupTimer);_rankupTimer=null;
      _turnLock=false;_tokenUsed=false;_moveToken=null;_lastClickMs=0;
      _currentMode=mode;_currentRanked=rankedMode;  // snapshot
      _newSession();                                  // [AC-7,9] fresh session
      _pp.resetGame();                               // reset per-game pattern state
      currentPlayer="X";gameActive=!!mode;
      closePopup();_setThinking(false);updateTurnChips();updateStatus();
      createBoard();
      if(rankedMode){updateConfigChips();updatePtsPreview();}
    }
    function resetScore(){
      _resetScore();_saveScore();
      _turnLock=false;_moveToken=null;
      // Full reset including cross-game pattern memory
      _pp.dirBias={h:0,v:0,d1:0,d2:0};
      _pp.aggression=0.5; _pp.aggrN=0;
      _pp.gamesPlayed=0; _pp.totalMoveCount=0;
      showToast("♻ STATS RESET");
      if(rankedMode){updateConfigChips();updatePtsPreview();}
    }
    
    // ══════════════════════════════════════════════════
    // EXPOSE minimal API to HTML onclick — everything
    // else is private inside IIFE closure
    // ══════════════════════════════════════════════════
    const _PUBLIC=["init","updateName","toggleRanked","setMode","setAILevel","handleClick",
                   "resetGame","resetScore","saveToLeaderboard","popupPlayAgain","closePopup",
                   "switchLbTab","showResult","renderLeaderboard","renderTiers"];
    const _pubMap={init,updateName,toggleRanked,setMode,setAILevel,handleClick,
                   resetGame,resetScore,saveToLeaderboard,popupPlayAgain,closePopup,
                   switchLbTab,showResult,renderLeaderboard,renderTiers};
    
    _PUBLIC.forEach(name=>{
      try{
        Object.defineProperty(window,name,{value:_pubMap[name],writable:false,configurable:false,enumerable:false});
      }catch(e){}
    });
    
    })(); // end IIFE