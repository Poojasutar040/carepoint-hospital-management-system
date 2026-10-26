import { useState } from "react"
export default function Login({onLogin}:{onLogin:()=>void}){
 const [u,setU]=useState(""); const [p,setP]=useState("");
 return (
  <div style={{display:"flex",height:"100vh",justifyContent:"center",alignItems:"center"}}>
   <div style={{border:"1px solid #ccc",padding:20,borderRadius:8}}>
    <h3>Login - Carepoint</h3>
    <input placeholder="Username" onChange={e=>setU(e.target.value)} style={{display:"block",margin:"10px 0",padding:8,width:"200px"}}/>
    <input type="password" placeholder="Password" onChange={e=>setP(e.target.value)} style={{display:"block",margin:"10px 0",padding:8,width:"200px"}}/>
    <button onClick={()=>{if(u==="admin"&&p==="admin123"){localStorage.setItem("login","yes");onLogin()}else alert("Wrong password")}} style={{padding:"8px 20px"}}>Login</button>
   </div>
  </div>
 )
}
