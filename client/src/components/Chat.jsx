import React, { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";

function Chat({ socket, username, room }) {
    const [currentMessage, setCurrentMessage] = useState("");
    const [messageList, setMessageList] = useState([]);
    const [file, setFile] = useState(null);

    const sendMessage = async () => {
        if (currentMessage !== "" || file) {
            const messageData = {
                room: room,
                author: username,
                message: currentMessage,
                type: file ? file.type : "text",
                body: file ? file.body : currentMessage,
                mimeType: file ? file.mimeType : null,
                time:
                    new Date(Date.now()).getHours() +
                    ":" +
                    new Date(Date.now()).getMinutes(),
            };

            await socket.emit("send_message", messageData);
            setMessageList((list) => [...list, messageData]);
            setCurrentMessage("");
            setFile(null);
        }
    };

    const selectFile = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = () => {
                setFile({
                    type: selectedFile.type.startsWith("image") ? "image" : "video",
                    body: reader.result,
                    mimeType: selectedFile.type,
                    name: selectedFile.name
                });
                setCurrentMessage(selectedFile.name); // Show filename in input
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    useEffect(() => {
        const receiveMessageHandler = (data) => {
            setMessageList((list) => [...list, data]);
        };

        socket.on("receive_message", receiveMessageHandler);

        return () => {
            socket.off("receive_message", receiveMessageHandler);
        };
    }, [socket]);

    const renderMessageContent = (messageContent) => {
        if (messageContent.type === "image") {
            return <img src={messageContent.body} alt="shared" className="message-image" />;
        } else if (messageContent.type === "video") {
            return <video src={messageContent.body} controls className="message-video" />;
        } else {
            return <p>{messageContent.message}</p>;
        }
    };

    return (
        <div className="chat-window">
            <div className="chat-header">
                <p>Quick Chat</p>
            </div>
            <div className="chat-body">
                <ScrollToBottom className="message-container">
                    {messageList.map((messageContent, index) => {
                        return (
                            <div
                                className="message"
                                id={username === messageContent.author ? "you" : "other"}
                                key={index}
                            >
                                <div>
                                    <div className="message-content">
                                        {renderMessageContent(messageContent)}
                                    </div>
                                    <div className="message-meta">
                                        <p id="time">{messageContent.time}</p>
                                        <p id="author">{messageContent.author}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </ScrollToBottom>
            </div>
            <div className="chat-footer">
                <input
                    type="file"
                    onChange={selectFile}
                    style={{ display: "none" }}
                    id="file-input"
                />
                <label htmlFor="file-input" className="file-btn">
                    &#128206;
                </label>
                <input
                    type="text"
                    value={currentMessage}
                    placeholder="Hey..."
                    onChange={(event) => {
                        setCurrentMessage(event.target.value);
                    }}
                    onKeyPress={(event) => {
                        event.key === "Enter" && sendMessage();
                    }}
                />
                <button onClick={sendMessage}>&#9658;</button>
            </div>
        </div>
    );
}

export default Chat;
