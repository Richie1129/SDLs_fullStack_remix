import React from 'react'

export default function AssignMember({menberData, setMenberData, setCardData }) {

    const handleChangeCheckBox = (e) => {
        const {name, checked} = e.target;
        if(name ==="allSelect"){
            let tempMenber = menberData.map((menber) =>{
                return {...menber, isChecked: checked};
            });
            setMenberData(tempMenber);
            const filterIsChecked = tempMenber.filter( item => item.isChecked === true)
            setCardData(prev=>({
                ...prev,
                assignees:filterIsChecked
            }))  
        } else{
            let tempMenber = menberData.map((menber) =>
                menber.username === name ? {...menber, isChecked: checked} : menber
            )
            setMenberData(tempMenber);
            const filterIsChecked = tempMenber.filter( item => item.isChecked === true)
            setCardData(prev=>({
                ...prev,
                assignees:filterIsChecked
            }))  
        }
        
    };

    return (
        <>
            <div className='flex flex-row  justify-between bg-customgray w-full p-component-xs mt-2'>
                <div className='text-body'>全部成員</div>
                <input 
                    type="checkbox" 
                    className="w-4 h-4 m-1 bg-gray-100 border-gray-300 rounded checked:bg-blue-500"
                    name='allSelect'
                    onChange={handleChangeCheckBox}
                    />
            </div>
            <h4 className='font-bold mt-2 mb-2'>專案成員</h4>
            {
                menberData.map((member, index) => {
                    return(
                        <div key={index} className='flex flex-row  justify-between bg-customgray w-full p-component-xs mb-2'>
                            <div className=' text-body'>{member.username}</div>
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 m-1 bg-gray-100 border-gray-300 rounded checked:bg-blue-500" 
                                name={member.username}
                                checked={member?.isChecked || false}
                                onChange={handleChangeCheckBox}
                                />
                        </div>
                    )
                })
            }
        </>
        
    )
}
