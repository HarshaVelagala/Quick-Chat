
import React, { useEffect, useState, useRef } from "react";
import Peer from "simple-peer";

const VideoCall = ({ socket, username, room }) => {
    const [stream, setStream] = useState();
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);
    const [idToCall, setIdToCall] = useState("");
    const [callEnded, setCallEnded] = useState(false);
    const [name, setName] = useState("");
    const [me, setMe] = useState("");

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        // Get socket ID
        socket.on("connect", () => {
            setMe(socket.id);
        });
        if (socket.id) setMe(socket.id); // In case already connected

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
            setStream(stream);
            if (myVideo.current) {
                myVideo.current.srcObject = stream;
            }
        });

        socket.on("callUser", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setName(data.name);
            setCallerSignal(data.signal);
        });

        socket.on("callAccepted", (signal) => {
            setCallAccepted(true);
            // This will be handled in initCall 
        });

        return () => {
            socket.off("callUser");
            socket.off("callAccepted");
        }
    }, [socket]);

    const callUser = (id) => {
        const peer = new Peer({ initiator: true, trickle: false, stream: stream });

        peer.on("signal", (data) => {
            socket.emit("callUser", {
                userToCall: id,
                signalData: data,
                from: me,
                name: username,
            });
        });

        peer.on("stream", (stream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = stream;
            }
        });

        socket.on("callAccepted", (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new Peer({ initiator: false, trickle: false, stream: stream });

        peer.on("signal", (data) => {
            socket.emit("answerCall", { signal: data, to: caller });
        });

        peer.on("stream", (stream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = stream;
            }
        });

        peer.signal(callerSignal);

        connectionRef.current = peer;
    };

    const leaveCall = () => {
        setCallEnded(true);
        if (connectionRef.current) {
            connectionRef.current.destroy();
        }
        // Force reload or state reset might be better in big app
        window.location.reload();
    };

    // We need a way to know WHO to call. For simplicity in this room-based chat, 
    // we might need to know the socketID of the other person. 
    // IN A ROOM CHAT: This simplistic 1-on-1 depends on knowing the specific Socket ID.
    // For now, I'll add an input to enter ID to call, OR we assume 1-on-1 room logic
    // where we broadcast to room? 
    // Standard SimplePeer is p2p 1-on-1. 
    // To make this work seamlessly in the room, we'd need to track users in room.
    // Let's implement an input for "Socket ID to Call" for now as per P2P standard tutorial,
    // OR try to call "everyone" (first other person) in room.

    // Better UX: Show "Call Room" button? But simple-peer is 1:1.
    // Let's stick to: Enter ID to call (debugging) or simpler: 
    // When "Call" is clicked, we need a target.
    // For this MVP, let's just show the Copy ID button and Enter ID to call.

    return (
        <div className="video-call-container">
            <div className="video-container">
                <div className="video">
                    {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
                </div>
                <div className="video">
                    {callAccepted && !callEnded ?
                        <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} /> :
                        null}
                </div>
            </div>

            <div className="call-controls">
                <div className="my-id">
                    <p>My Call ID: {me}</p>
                    <button onClick={() => navigator.clipboard.writeText(me)}>Copy ID</button>
                </div>

                <div className="call-actions">
                    <input
                        type="text"
                        placeholder="ID to Call"
                        value={idToCall}
                        onChange={(e) => setIdToCall(e.target.value)}
                    />
                    {callAccepted && !callEnded ? (
                        <button onClick={leaveCall} className="end-call-btn">End Call</button>
                    ) : (
                        <button onClick={() => callUser(idToCall)} className="start-call-btn">Call</button>
                    )}
                </div>

                {receivingCall && !callAccepted ? (
                    <div className="incoming-call">
                        <h1>{name} is calling...</h1>
                        <button onClick={answerCall} className="answer-call-btn">Answer</button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default VideoCall;
